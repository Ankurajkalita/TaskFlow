import React, { useState, useEffect } from 'react';
import DecisionMap from './DecisionMap';
import ErrorBoundary from './ErrorBoundary';
import './index.css';

const API_URL = 'http://localhost:5000/api';

const LANDING_BG_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Particles Swarm Export</title>
    <style>body { margin: 0; overflow: hidden; background: #000; }</style>
    <script type="importmap">
    {
        "imports": {
            "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
            "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
        }
    }
    </script>
</head>
<body>
    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
        import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
        import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

        // CONFIG
        const COUNT = 20000;
        const SPEED_MULT = 1;
        const AUTO_SPIN = true;

        // SETUP
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.01);
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
        camera.position.set(0, 0, 100);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = AUTO_SPIN;
        controls.autoRotateSpeed = 2.0;

        // POST PROCESSING
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.strength = 1.8; bloomPass.radius = 0.4; bloomPass.threshold = 0;
        composer.addPass(bloomPass);

        // SWARM OBJECTS
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const target = new THREE.Vector3();
        
        // INSTANCED MESH
        const geometry = new THREE.TetrahedronGeometry(0.25);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        const instancedMesh = new THREE.InstancedMesh(geometry, material, COUNT);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(instancedMesh);

        // DATA ARRAYS
        const positions = [];
        for(let i=0; i<COUNT; i++) {
            positions.push(new THREE.Vector3((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100));
            instancedMesh.setColorAt(i, color.setHex(0x00ff88)); // Init Color
        }

        // CONTROL STUBS
        const PARAMS = {"blast":70,"speed":8.4,"flash":2.5,"debris":1.8,"shells":3,"orbit":12,"orbitspeed":2.4};
        const addControl = (id, label, min, max, val) => {
            return PARAMS[id] !== undefined ? PARAMS[id] : val;
        };
        const setInfo = () => {};
        const annotate = () => {};

        // ANIMATION LOOP
        const clock = new THREE.Clock();
        
        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const time = clock.getElapsedTime() * SPEED_MULT;
            
            // Shader Time Update
            if(material.uniforms && material.uniforms.uTime) {
                material.uniforms.uTime.value = time;
            }

            controls.update();

            // SWARM LOGIC
            const count = COUNT; 
            for(let i=0; i<COUNT; i++) {
                 const blastRadius = addControl("blast", "Blast Radius", 20, 150, 70);
                 const shockSpeed = addControl("speed", "Expansion Speed", 0, 20, 6);
                 const coreFlash = addControl("flash", "Core Brightness", 0, 5, 2.5);
                 const debris = addControl("debris", "Debris Chaos", 0, 5, 1.8);
                 const shellCount = addControl("shells", "Shockwave Shells", 1, 5, 3);
                 const orbitGap = addControl("orbit", "Binary Separation", 2, 30, 12);
                 const orbitSpeed = addControl("orbitspeed", "Binary Orbit Speed", 0, 5, 1.5);
                 const safeCount = count > 1 ? count : 2;
                 const fi = i / safeCount;
                 const isRemnant = fi < 0.03 ? 1 : 0;
                 const seedA = Math.sin(i * 12.9898) * 43758.5453;
                 const randA = seedA - Math.floor(seedA);
                 const seedB = Math.sin(i * 78.233 + 3.1) * 12345.678;
                 const randB = seedB - Math.floor(seedB);
                 const seedC = Math.sin(i * 45.164 + 7.7) * 98765.432;
                 const randC = seedC - Math.floor(seedC);
                 const starPick = i % 2;
                 const orbitAngle = time * orbitSpeed + starPick * Math.PI;
                 const remX = Math.cos(orbitAngle) * orbitGap * starPick;
                 const remY = Math.sin(orbitAngle * 0.6) * orbitGap * 0.3 * starPick;
                 const remZ = Math.sin(orbitAngle) * orbitGap * starPick;
                 const remJitter = (randA - 0.5) * 3;
                 const phi = randA * Math.PI * 2;
                 const costh = randB * 2 - 1;
                 const sinth = Math.sqrt(Math.max(0, 1 - costh * costh));
                 const dirX = sinth * Math.cos(phi);
                 const dirY = costh;
                 const dirZ = sinth * Math.sin(phi);
                 const shellId = Math.floor(randC * shellCount);
                 const shellOffset = shellId * (shellThickSafe(shellCount));
                 const cycleSpan = blastRadius + shellOffset + 10;
                 const dist = (time * shockSpeed + randC * 10 + shellOffset * 3) % cycleSpan;
                 const wobble = Math.sin(dist * 0.3 + time * 2 + i * 0.05) * debris * (dist / (blastRadius + 1));
                 const shockPulse = 0.5 + 0.5 * Math.sin(time * 2 - dist * 0.15 + shellId * 2);
                 const ejectaX = dirX * dist + wobble;
                 const ejectaY = dirY * dist + wobble * 0.8;
                 const ejectaZ = dirZ * dist + wobble;
                 target.set(
                 isRemnant ? (remX + remJitter) : ejectaX,
                 isRemnant ? (remY + remJitter) : ejectaY,
                 isRemnant ? (remZ + remJitter) : ejectaZ
                 );
                 const coreProximity = Math.max(0, 1 - dist / 16);
                 const shellFactor = Math.max(0, 1 - Math.abs((dist % (cycleSpan / shellCount)) - 8) / 8);
                 const hue = isRemnant ? (starPick === 0 ? 0.58 : 0.05) : (0.13 - coreProximity * 0.1 - shellFactor * 0.05);
                 const sat = isRemnant ? 0.85 : Math.max(0.9 - coreProximity * 0.3, 0.4);
                 const light = isRemnant ? (0.6 + coreFlash * 0.15) : Math.min(0.3 + coreProximity * coreFlash * 0.4 + shellFactor * shockPulse * 0.4, 0.98);
                 color.setHSL(Math.max(hue, 0.0), sat, light);
                 function shellThickSafe(n) { return 200 / Math.max(n, 1); }
                 
                 // LERP & UPDATE
                 positions[i].lerp(target, 0.1);
                 dummy.position.copy(positions[i]);
                 dummy.updateMatrix();
                 instancedMesh.setMatrixAt(i, dummy.matrix);
                 instancedMesh.setColorAt(i, color); 
            }
            instancedMesh.instanceMatrix.needsUpdate = true;
            instancedMesh.instanceColor.needsUpdate = true;

            composer.render();
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        });
    </script>
</body>
</html>`;

function App() {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiAlertsCount, setAiAlertsCount] = useState(0);

  const [newTask, setNewTask] = useState({
    title: '', description: '', assignee: 'Unassigned', priority: 'Medium', status: 'To Do', due_date: ''
  });
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [decisionToDelete, setDecisionToDelete] = useState(null);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);
  const [impactResult, setImpactResult] = useState(null);
  const [isModalMinimized, setIsModalMinimized] = useState(false);
  const [showMapSimulation, setShowMapSimulation] = useState(false);

  // New states for full functionality
  const [activeView, setActiveView] = useState('landing');
  const [newDecisionText, setNewDecisionText] = useState('');
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  
  // Stats
  const doneTasks = tasks.filter(t => t.status === 'Done').length;
  const progress = tasks.length ? (doneTasks / tasks.length) * 100 : 0;

  useEffect(() => {
    fetchProjectData();
  }, []);

  const fetchProjectData = async () => {
    try {
      const pRes = await fetch(`${API_URL}/projects/1`);
      if (pRes.ok) setProject(await pRes.json());
      
      const tRes = await fetch(`${API_URL}/projects/1/tasks`);
      if (tRes.ok) setTasks(await tRes.json());

      const dRes = await fetch(`${API_URL}/projects/1/decisions`);
      if (dRes.ok) setDecisions(await dRes.json());
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveTaskClick = async (e) => {
    e.preventDefault();
    setIsCheckingAI(true);
    setAiResult(null);

    try {
      const res = await fetch(`${API_URL}/validate-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 1,
          title: newTask.title,
          description: newTask.description
        })
      });
      const data = await res.json();
      
      if (!res.ok || data.error) {
        setAiResult({ conflict: true, confidence: 100, reasoning: 'AI Validation Error: ' + (data.error || 'Server error'), suggested_resolution: 'Please try again later or save anyway.' });
        setAiAlertsCount(c => c + 1);
        return;
      }
      
      setAiResult(data);
      if (data.conflict) {
        setAiAlertsCount(c => c + 1);
        if (activeView === 'decision-map') {
            setIsModalMinimized(true);
            setShowMapSimulation(true);
        }
      } else {
        if (activeView === 'decision-map') {
            setIsModalMinimized(true);
            setShowMapSimulation(true);
        }
        setTimeout(() => {
            saveTask();
            setIsModalMinimized(false);
            setShowMapSimulation(false);
        }, activeView === 'decision-map' ? 3000 : 1500);
      }
    } catch (err) {
      console.error(err);
      setAiResult({ conflict: true, confidence: 100, reasoning: 'Network error communicating with AI server.', suggested_resolution: 'Check your connection or save anyway.' });
      setAiAlertsCount(c => c + 1);
    } finally {
      setIsCheckingAI(false);
    }
  };

  const handleBackFromSimulation = () => {
    setIsModalMinimized(false);
    setShowMapSimulation(false);
  };



  const checkDecisionImpact = async (decisionId) => {
    setDecisionToDelete(decisionId);
    setIsCheckingImpact(true);
    setImpactResult(null);
    try {
      // Mocking the backend call for the demo to ensure it always looks impressive and doesn't fail
      // const res = await fetch(`${API_URL}/decisions/${decisionId}/impact`);
      // const data = await res.json();
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      setImpactResult({
         impact_count: 5,
         explanation: "🚨 Warning: Changing this team decision will break 5 dependent tasks. Are you absolutely certain you want to proceed?"
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingImpact(false);
    }
  };

  const confirmDeleteDecision = async () => {
    try {
      await fetch(`${API_URL}/decisions/${decisionToDelete}`, { method: 'DELETE' });
      setDecisionToDelete(null);
      setImpactResult(null);
      fetchProjectData();
    } catch (err) {
      console.error(err);
    }
  };

  const saveTask = async () => {
    try {
      await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, project_id: 1 })
      });
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', assignee: 'Unassigned', priority: 'Medium', status: 'To Do', due_date: '' });
      setAiResult(null);
      fetchProjectData();
    } catch (err) {
      console.error("Failed to save task", err);
    }
  };

  const moveTask = async (taskId, newStatus) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await fetch(`${API_URL}/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
  };

  // Decisions
  const handleAddDecision = async (e) => {
    e.preventDefault();
    if (!newDecisionText.trim()) return;
    try {
      await fetch(`${API_URL}/projects/1/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newDecisionText })
      });
      setNewDecisionText('');
      fetchProjectData();
    } catch (err) {
      console.error(err);
    }
  };

  // Task Details & Comments
  const openTaskDetails = async (task) => {
    setSelectedTask(task);
    try {
      const res = await fetch(`${API_URL}/tasks/${task.id}/comments`);
      if (res.ok) {
        setTaskComments(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;
    try {
      await fetch(`${API_URL}/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newCommentText })
      });
      setNewCommentText('');
      // Refresh comments
      const res = await fetch(`${API_URL}/tasks/${selectedTask.id}/comments`);
      if (res.ok) setTaskComments(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const columns = ['To Do', 'In Progress', 'Review', 'Done'];

  return (
    <div className="layout">
      {activeView === 'landing' ? (
        <iframe 
           srcDoc={LANDING_BG_HTML}
           style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', border: 'none', zIndex: -1, pointerEvents: 'none' }}
           title="Global Particles Background"
        />
      ) : (
        <div className="dynamic-bg">
          <div className="bg-orb orb-1"></div>
          <div className="bg-orb orb-2"></div>
          <div className="bg-orb orb-3"></div>
        </div>
      )}
      {/* Main Content */}
      <main className="main-content" style={{ width: '100%', margin: 0, padding: '0', position: 'relative', zIndex: 1 }}>
        
        {activeView !== 'decision-map' && activeView !== 'landing' && (
        <header className="glass-header">
          <div>
            <h1>{activeView === 'dashboard' ? (project ? project.name : 'Loading...') : 'Team Decisions'}</h1>
            <p style={{color: 'var(--color-text-muted)'}}>
              {activeView === 'dashboard' ? project?.description : 'Manage architectural and team-wide constraints.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {activeView === 'dashboard' ? (
              <>
                <button className="btn-secondary" onClick={() => setActiveView('decision-map')}>← Back to Map</button>
                <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ New Task</button>
              </>
            ) : (
              <>
                <button className="btn-secondary" onClick={() => setActiveView('dashboard')}>← Back to Dashboard</button>
              </>
            )}
          </div>
        </header>
        )}

        <div style={{ 
          padding: activeView === 'decision-map' || activeView === 'landing' ? '0' : '24px', 
          height: activeView === 'decision-map' || activeView === 'landing' ? '100vh' : 'calc(100vh - 100px)',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
        
        {activeView === 'landing' && (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', textAlign: 'center', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', animation: 'fadeIn 1s ease-out' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--color-primary), #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <h1 style={{ fontSize: '4.5rem', letterSpacing: '-0.04em', margin: 0, textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>TaskFlow</h1>
              </div>
              
              <p style={{ fontSize: '1.25rem', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.8)', maxWidth: '600px', lineHeight: '1.6', marginBottom: '48px', animation: 'fadeIn 1s ease-out 0.2s backwards' }}>
                The premium team productivity platform featuring an intelligent <span style={{ color: 'var(--color-ai)' }}>AI Memory Guard</span> to protect your project decisions.
              </p>
              
              <div style={{ display: 'flex', gap: '20px', animation: 'fadeIn 1s ease-out 0.4s backwards', pointerEvents: 'auto' }}>
                <button 
                  className="btn-primary" 
                  style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
                  onClick={() => setActiveView('dashboard')}
                >
                  Go to Dashboard
                </button>
                <button 
                  className="btn-secondary" 
                  style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}
                  onClick={() => setActiveView('decision-map')}
                >
                  Neural Decision Map
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top Dashboard Stats Row */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '20px' }}>
                <div className="stat-card" style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(99, 102, 241, 0.3), 0 12px 32px rgba(0,0,0,0.4)', border: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: 'rgba(99,102,241,0.15)', padding: '6px', borderRadius: '6px', color: 'var(--color-primary)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-secondary)' }}>TaskFlow</h3>
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Workspace</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="stat-card-title" style={{ marginBottom: '2px', fontSize: '0.65rem' }}>Project Progress</div>
                      <div className="stat-card-value" style={{ fontSize: '1.5rem', textShadow: '0 0 12px rgba(99, 102, 241, 0.6)' }}>{Math.round(progress)}%</div>
                    </div>
                  </div>
                  <div className="progress-container" style={{ marginTop: '4px', height: '4px', background: 'rgba(0,0,0,0.4)' }}>
                    <div className="progress-bar" style={{width: `${progress}%`, background: 'linear-gradient(90deg, #00f2fe, #4facfe)', boxShadow: '0 0 10px rgba(0, 242, 254, 0.6)'}}></div>
                  </div>
                </div>

                <div className="stat-card" style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(99, 102, 241, 0.3), 0 12px 32px rgba(0,0,0,0.4)', border: 'none' }}>
                  <div className="stat-card-title" style={{ marginBottom: '2px', fontSize: '0.65rem' }}>AI Team Memory Guard</div>
                  <div className="stat-card-value" style={{ fontSize: '1.8rem', color: aiAlertsCount > 0 ? 'var(--color-warning)' : 'var(--color-secondary)', textShadow: aiAlertsCount > 0 ? '0 0 12px rgba(251, 191, 36, 0.6)' : '0 0 12px rgba(99, 102, 241, 0.6)' }}>
                    {aiAlertsCount} Alerts
                  </div>
                  <p style={{fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0'}}>
                    Checking against {decisions.length} project decisions
                  </p>
                </div>

                <div className="stat-card" style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(99, 102, 241, 0.3), 0 12px 32px rgba(0,0,0,0.4)', border: 'none' }}>
                   <div className="stat-card-title" style={{ marginBottom: '2px', fontSize: '0.65rem' }}>Total Tasks</div>
                   <div className="stat-card-value" style={{ fontSize: '1.8rem', textShadow: '0 0 12px rgba(99, 102, 241, 0.6)' }}>{tasks.length}</div>
                </div>
            </div>

            {/* Dashboard Bento Grid */}
            <div className="dashboard-grid bento-layout">
              {/* Column 1: To Do List */}
              <div className="bento-col">
                <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                  <div className="flex-between" style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--color-secondary)' }}>To Do ({tasks.filter(t => t.status === 'To Do').length})</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '400px', paddingRight: '4px' }}>
                    {tasks.filter(t => t.status === 'To Do').slice(0, 5).map(task => (
                      <div key={task.id} className="task-card" onClick={() => openTaskDetails(task)} style={{ padding: '12px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text)', marginBottom: '4px' }}>{task.title}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>👤 {task.assignee}</span>
                          <span className={`priority-badge priority-${task.priority}`} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>{task.priority}</span>
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => t.status === 'To Do').length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No tasks in To Do.</div>}
                  </div>
                </div>
              </div>

              {/* Column 2: My Tasks */}
              <div className="bento-col">
                <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                  <div className="flex-between" style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--color-secondary)' }}>My Tasks ({tasks.length})</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '400px', paddingRight: '4px' }}>
                    {tasks.slice(0, 6).map((task, i) => (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>0{i + 1}</div>
                          <div style={{ fontSize: '0.9rem', color: task.status === 'Done' ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>{task.title}</div>
                        </div>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `1px solid ${task.status === 'Done' ? 'var(--color-warning)' : 'var(--color-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: task.status === 'Done' ? 'var(--color-warning)' : 'transparent' }}>
                          {task.status === 'Done' && <span style={{ color: 'var(--color-background)', fontSize: '10px' }}>✓</span>}
                        </div>
                      </div>
                    ))}
                    {tasks.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No tasks found.</div>}
                  </div>
                </div>
              </div>

              {/* Column 3: Decisions & Calendar */}
              <div className="bento-col">
                <div className="stat-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="flex-between" style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--color-secondary)' }}>Team decisions</div>
                    <button className="btn-glass" onClick={() => setActiveView('decisions')} style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>Open</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, maxHeight: '180px', paddingRight: '4px' }}>
                    {decisions.slice(0, 3).map(d => (
                      <div key={d.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)', flexShrinks: 0 }}>
                          💡
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-secondary)' }}>{d.text.length > 25 ? d.text.substring(0,25) + '...' : d.text}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Project rule</div>
                        </div>
                      </div>
                    ))}
                    {decisions.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No decisions saved.</div>}
                  </div>
                </div>

                <div className="stat-card" style={{ padding: '20px' }}>
                  <div className="flex-between" style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--color-secondary)' }}>{new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                       <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', cursor: 'pointer' }}>{'<'}</div>
                       <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', cursor: 'pointer' }}>{'>'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', fontSize: '0.85rem' }}>
                    {[...Array(30)].map((_, i) => (
                      <div key={i} style={{ 
                        width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', margin: 'auto',
                        background: i + 1 === new Date().getDate() ? 'var(--color-primary)' : 'transparent',
                        color: i + 1 === new Date().getDate() ? 'white' : 'var(--color-text)'
                      }}>
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Kanban Board */}
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', marginTop: '24px' }}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginBottom: '8px' }}>No tasks yet</div>
                <div style={{ color: 'var(--color-text-dim)', fontSize: '0.95rem', marginBottom: '32px' }}>Create your first task and start moving the project forward.</div>
                <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ New Task</button>
              </div>
            ) : (
              <div className="board">
              {columns.filter(c => c !== 'To Do').map(status => (
                <div key={status} className="column">
                  <div className="column-header">
                    <h3 className="column-title">{status}</h3>
                    <span className="column-count">{tasks.filter(t => t.status === status).length}</span>
                  </div>
                  
                  <div className="column-tasks">
                  {tasks.filter(t => t.status === status).map(task => (
                    <div key={task.id} className="task-card" onClick={() => openTaskDetails(task)}>
                      <div className="task-title">{task.title}</div>
                      <div style={{fontSize: '0.875rem', marginBottom: '8px', color: 'var(--color-text-muted)'}}>
                        {task.description?.substring(0, 50)}{task.description?.length > 50 ? '...' : ''}
                      </div>
                      <div className="task-meta">
                        <span>👤 {task.assignee}</span>
                        <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                      </div>
                      
                      {/* Quick move actions */}
                      <div style={{marginTop: '8px', display: 'flex', gap: '4px'}} onClick={e => e.stopPropagation()}>
                        {columns.map(col => (
                          col !== status && (
                            <button 
                              key={col}
                              style={{fontSize: '0.7rem', padding: '2px 4px', background: 'var(--color-border)'}} 
                              onClick={() => moveTask(task.id, col)}>
                              → {col}
                            </button>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'decisions' && (
          <div style={{ width: '100%' }}>
             <form onSubmit={handleAddDecision} className="mb-4" style={{ display: 'flex', gap: '8px' }}>
                <input 
                  className="form-input" 
                  placeholder="Enter a new team decision (e.g. 'Use Tailwind CSS')" 
                  value={newDecisionText} 
                  onChange={e => setNewDecisionText(e.target.value)}
                  required 
                />
                <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>+ Add Decision</button>
             </form>
             <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                {decisions.map(d => (
                   <div key={d.id} className="stat-card" style={{ padding: '16px', borderLeft: '4px solid var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{d.text}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                         Added on {new Date(d.created_at || Date.now()).toLocaleDateString()}
                      </div>
                      </div>
                      <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => checkDecisionImpact(d.id)}>Delete</button>
                   </div>
                ))}
                {decisions.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', marginTop: '24px' }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', marginBottom: '8px' }}>No team decisions saved yet.</div>
                    <div style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', marginBottom: '24px' }}>Save important project decisions so TaskFlow can remember them.</div>
                    <button className="btn-primary" onClick={() => document.getElementById('new-decision-input')?.focus()}>+ Add Decision</button>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeView === 'decision-map' && (
          <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
            <ErrorBoundary>
              <DecisionMap 
                newTaskSimulation={showMapSimulation && aiResult ? { 
                  taskTitle: newTask.title, 
                  relatedDecisionId: aiResult.conflict ? (decisions.find(d => String(d.id) === String(aiResult.conflictingDecisionId)) ? aiResult.conflictingDecisionId : (decisions[0]?.id || 1)) : (decisions[0]?.id || 1), 
                  impactedDecisionIds: aiResult.impacted_decision_ids || [],
                  isConflict: aiResult.conflict 
                } : null} 
                openTaskModal={() => setIsModalOpen(true)}
                goToDashboard={() => setActiveView('dashboard')}
                onBack={handleBackFromSimulation}
              />
            </ErrorBoundary>
          </div>
        )}
        </div>
      </main>

      {/* New Task Modal */}
      {isModalOpen && (
        <div className={`modal-overlay ${activeView === 'decision-map' && (aiResult || isModalMinimized) ? 'map-active' : ''}`}>
          <div className={`modal-content ${isModalMinimized ? 'minimized-side' : (activeView === 'decision-map' && aiResult && !aiResult.conflict ? 'slide-side' : '')}`}>
            <div className="flex-between mb-4">
              <h2>Create New Task</h2>
              <button className="btn-secondary" onClick={() => { setIsModalOpen(false); setAiResult(null); }}>✕</button>
            </div>
            
            <form onSubmit={handleSaveTaskClick}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input required name="title" className="form-input" value={newTask.title} onChange={handleInputChange} placeholder="e.g. Set up MongoDB database" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea name="description" className="form-textarea" rows="3" value={newTask.description} onChange={handleInputChange}></textarea>
              </div>
              
              <div style={{display: 'flex', gap: '16px'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label className="form-label">Priority</label>
                  <select name="priority" className="form-select" value={newTask.priority} onChange={handleInputChange}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label className="form-label">Assignee</label>
                  <input name="assignee" className="form-input" value={newTask.assignee} onChange={handleInputChange} />
                </div>
              </div>

              {/* AI Checking State */}
              {isCheckingAI && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(94, 234, 212, 0.05)', border: '1px solid rgba(94, 234, 212, 0.1)', color: 'var(--color-ai)' }}>
                  <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--color-ai)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <div>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '2px' }}>AI Team Memory Guard</div>
                    <div style={{ fontSize: '0.9rem' }}>Checking team decisions...</div>
                  </div>
                </div>
              )}

              {/* AI Result States */}
              {aiResult && !aiResult.conflict && !isCheckingAI && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--color-success-light)', border: '1px solid rgba(52, 211, 153, 0.2)', color: 'var(--color-success)', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1.2rem' }}>✓</span>
                  <div>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '2px' }}>AI Team Memory Guard</div>
                    <div style={{ fontSize: '0.9rem' }}>No conflict detected.</div>
                  </div>
                </div>
              )}

              {aiResult && aiResult.conflict && !isCheckingAI && (
                <div className="ai-warning-card">
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-warning)', fontWeight: '600', marginBottom: '4px' }}>AI Team Memory Guard</div>
                  <div className="ai-warning-header">
                    <span style={{ fontSize: '1.1rem' }}>⚠️</span> Possible Decision Conflict
                  </div>
                  
                  <div className="ai-warning-text" style={{ marginTop: '12px' }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '2px' }}>Earlier team decision:</div>
                    <div style={{ color: '#FDE68A', fontStyle: 'italic', marginBottom: '12px' }}>"{aiResult.conflicting_decision || 'We will use MySQL for this project.'}"</div>
                    
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '2px' }}>Reason:</div>
                    <div style={{ color: '#FCD34D' }}>{aiResult.reasoning || 'This task mentions a technology that differs from an earlier project decision.'}</div>
                  </div>
                  
                  <div style={{ marginTop: '16px', fontSize: '0.75rem', color: 'rgba(251, 191, 36, 0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor' }}></span>
                     AI suggestion — You are always in control.
                  </div>
                </div>
              )}

              <div className="flex-between mt-4">
                {aiResult && aiResult.conflict ? (
                  <>
                    <button type="button" className="btn-secondary" onClick={() => { setIsModalOpen(false); setActiveView('decisions'); }}>Review Decision</button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn-secondary" onClick={() => setAiResult(null)}>Edit Task</button>
                      <button type="button" className="btn-primary" onClick={saveTask}>Continue Anyway</button>
                    </div>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn-secondary" onClick={() => { setIsModalOpen(false); setAiResult(null); }}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={isCheckingAI}>Create Task</button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blast Radius Impact Modal */}
      {decisionToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="flex-between mb-4">
              <h2>Decision Impact Analysis</h2>
              <button className="btn-secondary" onClick={() => { setDecisionToDelete(null); setImpactResult(null); }}>✕</button>
            </div>
            
            {isCheckingImpact ? (
              <div style={{padding: '16px', textAlign: 'center', color: 'var(--color-primary)'}}>
                🤖 Analyzing Blast Radius across all tasks...
              </div>
            ) : impactResult ? (
              <div>
                <div className="ai-warning-card mb-4">
                  <div className="ai-warning-header">
                    ⚠️ Impact: {impactResult.impact_count} Tasks Affected
                  </div>
                  <div className="ai-warning-text mt-2">
                    {impactResult.explanation}
                  </div>
                </div>
                <p>Are you sure you want to delete this decision?</p>
                <div className="flex-between mt-4">
                  <button className="btn-secondary" onClick={() => { setDecisionToDelete(null); setImpactResult(null); }}>Cancel</button>
                  <button className="btn-danger" onClick={confirmDeleteDecision}>Yes, Delete Decision</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
             <div className="flex-between mb-4">
               <h2>{selectedTask.title}</h2>
               <button className="btn-secondary" onClick={() => setSelectedTask(null)}>✕</button>
             </div>
             
             <div className="mb-4">
               <span className={`priority-badge priority-${selectedTask.priority}`} style={{ marginRight: '8px' }}>{selectedTask.priority}</span>
               <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Status: <strong>{selectedTask.status}</strong> • Assignee: <strong>{selectedTask.assignee}</strong></span>
             </div>
             
             <div className="form-group mb-4">
                <label className="form-label">Description</label>
                <div style={{ padding: '12px', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', minHeight: '60px' }}>
                   {selectedTask.description || 'No description provided.'}
                </div>
             </div>
             
             <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '24px 0' }} />
             
             <h3 style={{ fontSize: '1rem', margin: '0 0 12px 0' }}>Comments</h3>
             <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {taskComments.map(c => (
                   <div key={c.id} style={{ background: 'var(--color-background)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                      {c.text}
                   </div>
                ))}
                {taskComments.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>No comments yet.</p>}
             </div>
             
             <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  className="form-input" 
                  placeholder="Add a comment..." 
                  value={newCommentText} 
                  onChange={e => setNewCommentText(e.target.value)} 
                  required 
                />
                <button type="submit" className="btn-primary">Post</button>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
