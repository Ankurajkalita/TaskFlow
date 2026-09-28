import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const DecisionMap = ({ newTaskSimulation, openTaskModal, goToDashboard, onBack }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const fgRef = useRef();

  const fetchGraph = async (forceRefresh = false) => {
    setLoading(true);
    try {
      // Create an AbortController for 30s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout
      
      const res = await fetch(`http://localhost:5000/api/decisions/graph${forceRefresh ? '?refresh=true' : ''}`, {
          signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      if (data.nodes && (data.edges || data.links)) {
        let links = data.links || data.edges || [];
        
        // --- FORCED CONNECTIVITY (The "Web" Feel) ---
        // Manually connect specific stack components to ensure they form a cohesive network
        const findNode = (labelPart) => data.nodes.find(n => n.label.toLowerCase().includes(labelPart.toLowerCase()));
        const nNodeJs = findNode("node");
        const nMysql = findNode("mysql");
        const nReact = findNode("react");
        const nGraphql = findNode("rest") || findNode("graphql");
        const nJwt = findNode("jwt");
        
        const addLink = (src, tgt) => {
           if (src && tgt && src.id !== tgt.id) {
              if (!links.find(l => (l.source === src.id && l.target === tgt.id) || (l.source === tgt.id && l.target === src.id))) {
                 links.push({ source: src.id, target: tgt.id, type: 'related' });
              }
           }
        };
        addLink(nNodeJs, nMysql);
        addLink(nNodeJs, nGraphql);
        addLink(nReact, nGraphql);
        addLink(nJwt, nNodeJs);

        // Fallback: Ensure every isolated node connects to at least one other node
        for (let i = 0; i < data.nodes.length; i++) {
            const hasLink = links.some(l => l.source === data.nodes[i].id || l.target === data.nodes[i].id);
            if (!hasLink && data.nodes.length > 1) {
               const target = i > 0 ? data.nodes[i-1].id : data.nodes[1].id;
               links.push({ source: data.nodes[i].id, target: target, type: 'related' });
            }
        }

        setGraphData({
            nodes: data.nodes,
            links: links
        });
      } else {
        console.error("Invalid graph data:", data);
        setGraphData({ nodes: [], links: [] });
      }
    } catch (err) {
      console.error("Error fetching graph data:", err);
      // Fallback if fetch fails or times out
      setGraphData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  useEffect(() => {
    if (newTaskSimulation && newTaskSimulation.relatedDecisionId && graphData.nodes.length > 0) {
      const tempNodeId = 'temp-task-' + Date.now();
      const tempNode = {
        id: tempNodeId,
        label: newTaskSimulation.taskTitle,
        category: 'new task',
        isTemp: true,
        isConflict: newTaskSimulation.isConflict
      };
      
      // Link to the specific related decision
      const primaryEdge = {
        source: tempNodeId,
        target: String(newTaskSimulation.relatedDecisionId),
        type: newTaskSimulation.isConflict ? 'conflict' : 'related',
        isTemp: true,
        isConflict: newTaskSimulation.isConflict
      };
      
      const newEdges = [primaryEdge];

      // Add synergistic connections based on AI-determined impacts
      let impactedIds = newTaskSimulation.impactedDecisionIds || [];
      
      // Filter out the primary conflict node from impacted nodes to avoid duplicate edges
      impactedIds = impactedIds.filter(id => String(id) !== String(newTaskSimulation.relatedDecisionId));
      
      // If AI returned none, fallback to 1-2 random ones for demo purposes
      if (impactedIds.length === 0) {
        const otherNodes = graphData.nodes.filter(n => String(n.id) !== String(newTaskSimulation.relatedDecisionId) && !n.isTemp);
        const shuffledNodes = [...otherNodes].sort(() => 0.5 - Math.random());
        impactedIds = shuffledNodes.slice(0, 2).map(n => n.id);
      }
      
      impactedIds.forEach(id => {
         // Only add edge if the node actually exists in the graph
         if (graphData.nodes.find(n => String(n.id) === String(id))) {
           newEdges.push({
              source: tempNodeId,
              target: String(id),
              type: 'related', // Synergistic integration
              isTemp: true,
              isConflict: false
           });
         }
      });
      
      setGraphData(prev => ({
        nodes: [...prev.nodes, tempNode],
        links: [...(prev.links || []), ...newEdges]
      }));
      
      // Auto-zoom to fit the new node
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(400, 50);
        }
      }, 500);
    } else if (!newTaskSimulation) {
      setGraphData(prev => ({
        nodes: prev.nodes.filter(n => !n.isTemp),
        links: prev.links ? prev.links.filter(l => !l.isTemp) : []
      }));
    }
  }, [newTaskSimulation]);

  const paintNode = useCallback((node, ctx, globalScale) => {
    const label = node.label;
    const fontSize = 12 / globalScale;
    
    // Accessibility: check for reduced motion
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Beating animation based on time (Slow, smooth "breathing")
    const time = Date.now();
    let pulse = 0;
    if (!isReducedMotion) {
      const beatSpeed = node.isConflict ? 1500 : 3500; // Slower, smoother breathing
      const offset = (node.id.toString().charCodeAt(0) || 0) * 100; // Desynchronize beats
      pulse = Math.sin(((time + offset) % beatSpeed) / beatSpeed * Math.PI * 2) * 2.5;
    }
    
    // Base colors
    const neonColor = node.isTemp ? (node.isConflict ? '#ef4444' : '#10b981') : '#00f0ff';
    const neonGlowColor = node.isTemp ? (node.isConflict ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)') : 'rgba(0, 240, 255, 0.6)';
    
    const baseRadius = 16;
    const nodeRadius = (baseRadius + pulse) / globalScale;
    const innerRadius = (baseRadius - 4) / globalScale;
    const coreRadius = (baseRadius - 10 + pulse*0.5) / globalScale;
    
    // Outer Glowing Rim
    ctx.shadowBlur = (20 + pulse * 3) / globalScale;
    ctx.shadowColor = neonGlowColor;
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.8)'; // Dark background inside rim
    ctx.fill();
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 1.5 / globalScale;
    ctx.stroke();

    // Reset shadow for inner parts to prevent blowout
    ctx.shadowBlur = 0;

    // Inner Dark Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, innerRadius, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#020617';
    ctx.fill();
    
    // Inner Glowing Core
    ctx.shadowBlur = 10 / globalScale;
    ctx.shadowColor = neonGlowColor;
    ctx.beginPath();
    ctx.arc(node.x, node.y, coreRadius, 0, 2 * Math.PI, false);
    ctx.fillStyle = neonColor;
    ctx.fill();

    // Reset shadow for text
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowOffsetY = 2 / globalScale;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Main Text HUD styling
    ctx.font = `600 ${fontSize}px "Space Mono", "Courier New", monospace`;
    ctx.fillStyle = '#e2e8f0';
    
    // Slight glow on text
    ctx.shadowBlur = 8;
    ctx.shadowColor = neonGlowColor;
    ctx.fillText(label, node.x, node.y + nodeRadius + (fontSize * 1.5));
    
    // Category subtitle HUD styling
    if (node.category) {
        ctx.font = `400 ${fontSize * 0.75}px "Space Mono", "Courier New", monospace`;
        ctx.fillStyle = neonColor;
        ctx.shadowBlur = 4;
        ctx.fillText(`[${node.category.toUpperCase()}]`, node.x, node.y + nodeRadius + (fontSize * 2.8));
    }
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }, []);

  const paintEdge = useCallback((edge, ctx, globalScale) => {
    const start = edge.source;
    const end = edge.target;

    if (!start || !end || !start.x || !start.y || !end.x || !end.y) return;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    
    if (edge.type === 'conflict') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1.5 / globalScale;
      ctx.setLineDash([5 / globalScale, 5 / globalScale]);
      ctx.shadowBlur = 10 / globalScale;
      ctx.shadowColor = '#ef4444';
    } else if (edge.isTemp && !edge.isConflict) {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'; // Green for success
      ctx.lineWidth = 1.5 / globalScale;
      ctx.setLineDash([3 / globalScale, 3 / globalScale]);
      ctx.shadowBlur = 10 / globalScale;
      ctx.shadowColor = '#10b981';
    } else {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)'; // Faint Cyan fiber optic
      ctx.lineWidth = 1.5 / globalScale;
      ctx.setLineDash([]);
      ctx.shadowBlur = 5 / globalScale;
      ctx.shadowColor = 'rgba(0, 240, 255, 0.3)';
    }
    
    ctx.stroke();
    ctx.shadowBlur = 0; // reset
  }, []);

  const isReducedMotion = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      
      <div className="decision-map-container cinematic-container" style={{ 
          position: 'absolute', 
          inset: 0,
          background: '#000', // Deep black for the swarm
          overflow: 'hidden',
          boxShadow: 'inset 0 0 120px rgba(0, 0, 0, 0.9)'
      }}>

        {/* 3D Particle Swarm Background (Clifford Rift) */}
        {!isReducedMotion && (
            <iframe 
                src="/swarm-background.html" 
                style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    width: '100%', 
                    height: '100%', 
                    border: 'none', 
                    zIndex: 0,
                    opacity: 0.7, /* So it doesn't overpower the graph nodes */
                    pointerEvents: 'none' /* Allow clicking through to the graph */
                }} 
                title="Neural Swarm Activity"
            />
        )}
        
        {/* Cinematic Vignette to blend the edges */}
        <div className="cinematic-vignette"></div>

        {/* Stealth Command HUD (Header) */}
        <header className="stealth-hud-header" style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '24px 32px',
            zIndex: 20,
            pointerEvents: 'none' /* Let clicks pass through empty areas to map */
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <h1 style={{ margin: 0, fontFamily: '"Space Mono", monospace', textTransform: 'uppercase', letterSpacing: '2px', color: '#fff', textShadow: '0 0 10px rgba(0, 240, 255, 0.8), 0 0 20px rgba(0, 240, 255, 0.4)' }}>
              Neural System Link
            </h1>
            <p style={{ margin: '6px 0 0 0', color: '#00f0ff', fontFamily: '"Space Mono", monospace', fontSize: '13px', textShadow: '0 0 5px rgba(0, 240, 255, 0.5)' }}>
              &gt; INITIALIZING DECISION MATRIX... STATUS: ONLINE
            </p>
          </div>
          
          <div className="hud-buttons" style={{ display: 'flex', gap: '16px', pointerEvents: 'auto' }}>
            <button className="btn-secondary hud-btn" onClick={goToDashboard} style={{ backdropFilter: 'blur(8px)', background: 'rgba(2, 6, 23, 0.5)' }}>DISCONNECT</button>
            <button className="btn-secondary hud-btn" onClick={() => fetchGraph(true)} disabled={loading} style={{ backdropFilter: 'blur(8px)', background: 'rgba(2, 6, 23, 0.5)' }}>RECALIBRATE</button>
            <button className="btn-primary hud-btn" onClick={openTaskModal} style={{ boxShadow: '0 0 15px rgba(0,240,255,0.4)' }}>INJECT TASK</button>
          </div>
        </header>

        {/* Legend */}
        <div className="stealth-hud-legend" style={{ 
            position: 'absolute', bottom: 32, left: 32, zIndex: 10, 
            background: 'rgba(2, 6, 23, 0.4)', 
            backdropFilter: 'blur(12px)',
            padding: '16px 20px', borderRadius: '12px', 
            border: '1px solid rgba(0, 240, 255, 0.1)', 
            fontFamily: '"Space Mono", "Courier New", monospace',
            color: '#e2e8f0',
            pointerEvents: 'auto'
        }}>
          <div style={{ fontSize: '11px', color: '#00f0ff', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>System Legend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', fontSize: '13px' }}>
            <div style={{ width: '24px', height: '2px', background: '#00f0ff', boxShadow: '0 0 8px #00f0ff' }}></div> 
            <span style={{ textShadow: '0 0 4px rgba(0,240,255,0.5)' }}>Stable Connection</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
            <div style={{ width: '24px', height: '2px', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}></div> 
            <span style={{ color: '#ff7777', textShadow: '0 0 4px rgba(239,68,68,0.5)' }}>System Conflict</span>
          </div>
        </div>
        
        {newTaskSimulation && newTaskSimulation.isConflict && (
            <div style={{ position: 'absolute', top: 100, left: 32, zIndex: 10, maxWidth: '360px' }}>
                <div style={{ 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    color: '#fca5a5', padding: '16px 20px', 
                    borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.4)',
                    animation: isReducedMotion ? 'none' : 'fadeIn 0.4s ease-out',
                    marginBottom: '16px',
                    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2)',
                    fontFamily: '"Space Mono", monospace'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#ef4444', textShadow: '0 0 8px rgba(239,68,68,0.5)' }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span> 
                    CRITICAL OVERRIDE DETECTED
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(252, 165, 165, 0.9)', lineHeight: '1.5' }}>
                    &gt; CONFLICT: "{graphData.nodes.find(n => String(n.id) === String(newTaskSimulation.relatedDecisionId))?.label || 'Database choice'}" is already established. Task injection rejected.
                  </div>
                </div>
                <button className="btn-secondary" onClick={onBack} style={{ fontFamily: 'monospace', borderColor: '#ef4444', color: '#ef4444' }}>[ ABORT ]</button>
            </div>
        )}

        {newTaskSimulation && !newTaskSimulation.isConflict && (
            <div style={{ position: 'absolute', top: 100, left: 32, zIndex: 10, maxWidth: '360px' }}>
                <div style={{ 
                    background: 'rgba(16, 185, 129, 0.1)', 
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    color: '#6ee7b7', padding: '16px 20px', 
                    borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.4)',
                    animation: isReducedMotion ? 'none' : 'fadeIn 0.4s ease-out',
                    marginBottom: '16px',
                    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)',
                    fontFamily: '"Space Mono", monospace'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#10b981', textShadow: '0 0 8px rgba(16,185,129,0.5)' }}>
                    <span style={{ fontSize: '18px' }}>✓</span> 
                    INTEGRATION SUCCESSFUL
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(110, 231, 183, 0.9)', lineHeight: '1.5' }}>
                    &gt; Task architecture aligns with active protocols. Ready for execution.
                  </div>
                </div>
            </div>
        )}

        {loading && (!graphData.nodes || graphData.nodes.length === 0) ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#00f0ff', fontSize: '16px', fontFamily: '"Space Mono", monospace', textShadow: '0 0 10px #00f0ff' }}>
            &gt; ACCESSING NEURAL DATABASE...
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeCanvasObject={paintNode}
            linkCanvasObjectMode={() => 'replace'}
            linkCanvasObject={paintEdge}
            linkCurvature={0.25} /* Gives edges a subtle organic bend */
            linkDirectionalParticles={isReducedMotion ? 0 : 2}
            linkDirectionalParticleSpeed={d => d.type === 'conflict' ? 0.008 : 0.003} /* Slower data pulse */
            linkDirectionalParticleWidth={4} /* Brighter, larger pulse */
            linkDirectionalParticleColor={d => d.type === 'conflict' ? '#ef4444' : (d.isTemp ? '#10b981' : '#00f0ff')}
            cooldownTicks={150}
            onEngineStop={() => fgRef.current && fgRef.current.zoomToFit(600, 100)}
            d3Force="charge"
            d3ForceOptions={{ strength: -1000 }}
            backgroundColor="transparent"
          />
        )}
        
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .cinematic-vignette {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at center, transparent 20%, rgba(0, 0, 0, 0.95) 100%);
            z-index: 5;
            pointer-events: none;
          }
          
          /* HUD Interaction Styles */
          .stealth-hud-header .hud-buttons {
            opacity: 0.5;
            transition: opacity 0.4s ease;
          }
          .stealth-hud-header:hover .hud-buttons {
            opacity: 1;
          }
          
          .stealth-hud-legend {
            opacity: 0.6;
            transition: opacity 0.4s ease;
          }
          .stealth-hud-legend:hover {
            opacity: 1;
          }
          
          .hud-btn {
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease;
          }
          .hud-btn:hover {
            transform: scale(1.05) translateY(-2px);
          }
        `}</style>
      </div>
    </div>
  );
};

export default DecisionMap;
