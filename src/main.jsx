import React,{useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {supabase} from './lib/supabase'
import './style.css'
import {LogOut,Star,AlertCircle} from 'lucide-react'

const S={input:{padding:'10px 14px',border:'2px solid var(--border)',borderRadius:'8px',background:'var(--bg)',color:'var(--text)',width:'100%',fontSize:'14px'},
btn:(bg='#667eea',c='#fff')=>({padding:'10px 18px',background:bg,color:c,border:'none',borderRadius:'8px',fontWeight:600,cursor:'pointer',fontSize:'14px'}),
sm:(bg='#667eea')=>({padding:'6px 14px',background:bg,color:'#fff',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'12px',fontWeight:600})}

function App(){
  const[session,setSession]=useState(null)
  const[profile,setProfile]=useState(null)
  const[loading,setLoading]=useState(true)
  const[darkMode,setDarkMode]=useState(()=>{try{return localStorage.getItem('dm')==='1'}catch{return false}})

  useEffect(()=>{
    document.documentElement.classList.toggle('dark-mode',darkMode)
    localStorage.setItem('dm',darkMode?'1':'0')
  },[darkMode])

  useEffect(()=>{
    if(!supabase){setLoading(false);return}
    supabase.auth.getSession().then(({data})=>{setSession(data?.session);setLoading(false)})
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s))
    return()=>subscription?.unsubscribe()
  },[])

  useEffect(()=>{
    if(!session?.user){setProfile(null);return}
    supabase.from('profiles').select('*').eq('id',session.user.id).single().then(({data})=>setProfile(data))
  },[session])

  if(loading)return<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'var(--bg)'}}><div className="spinner"/></div>
  if(!supabase)return<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'var(--bg)',padding:20}}><div className="card" style={{maxWidth:500,textAlign:'center'}}><AlertCircle size={48} style={{color:'#ef4444',marginBottom:16}}/><h2>Setup Required</h2><p style={{margin:'12px 0'}}>Create <b>.env.local</b> with your Supabase URL and Anon Key</p></div></div>
  if(!session)return<Auth darkMode={darkMode} setDarkMode={setDarkMode}/>
  if(!profile)return<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><div className="spinner"/></div>
  if(profile.status==='pending')return<StatusScreen icon="⏳" title="Pending Approval" msg="Awaiting admin approval" darkMode={darkMode} setDarkMode={setDarkMode}/>
  if(profile.status==='rejected')return<StatusScreen icon="🚫" title="Access Denied" msg="Your account was rejected" darkMode={darkMode} setDarkMode={setDarkMode}/>

  return<div>
    <Header profile={profile} darkMode={darkMode} setDarkMode={setDarkMode}/>
    {profile.role==='admin'&&<AdminDashboard profile={profile}/>}
    {profile.role==='teacher'&&<TeacherDashboard profile={profile}/>}
    {profile.role==='student'&&<StudentDashboard profile={profile}/>}
  </div>
}

function StatusScreen({icon,title,msg,darkMode,setDarkMode}){
  return<div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <button onClick={()=>setDarkMode(!darkMode)} style={{position:'absolute',top:20,right:20,background:'none',border:'none',fontSize:24,cursor:'pointer'}}>{darkMode?'☀️':'🌙'}</button>
    <div className="card" style={{textAlign:'center',maxWidth:400}}>
      <p style={{fontSize:48,marginBottom:16}}>{icon}</p>
      <h2>{title}</h2><p style={{margin:'12px 0'}}>{msg}</p>
      <button onClick={()=>supabase.auth.signOut()} style={S.btn('#ef4444')}>Logout</button>
    </div>
  </div>
}

function Auth({darkMode,setDarkMode}){
  const[isLogin,setIsLogin]=useState(true)
  const[form,setForm]=useState({fullName:'',email:'',password:'',role:'student'})
  const[msg,setMsg]=useState('')
  const[busy,setBusy]=useState(false)
  const f=(k,v)=>setForm({...form,[k]:v})

  async function submit(e){
    e.preventDefault();setMsg('');setBusy(true)
    try{
      if(isLogin){
        const{error}=await supabase.auth.signInWithPassword({email:form.email,password:form.password})
        if(error)setMsg('❌ '+error.message)
      }else{
        const{data,error}=await supabase.auth.signUp({email:form.email,password:form.password})
        if(error){setMsg('❌ '+error.message);setBusy(false);return}
        if(data.user){
          await supabase.from('profiles').insert({id:data.user.id,full_name:form.fullName,email:form.email,role:form.role,status:'pending'})
          setMsg('✅ Account created! Awaiting admin approval')
          setForm({fullName:'',email:'',password:'',role:'student'})
        }
      }
    }catch(err){setMsg('❌ '+err.message)}
    setBusy(false)
  }

  return<div style={{minHeight:'100vh',background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
    <div style={{maxWidth:440,width:'100%'}}>
      <div style={{textAlign:'center',marginBottom:32,color:'#fff'}}>
        <h1 style={{fontSize:42,color:'#fff'}}>📚 AssignHub</h1>
        <p style={{color:'rgba(255,255,255,.8)',margin:'8px 0 16px'}}>Smart Assignment Management</p>
        <button onClick={()=>setDarkMode(!darkMode)} style={{background:'rgba(255,255,255,.15)',border:'none',cursor:'pointer',color:'#fff',fontSize:24,padding:'8px 16px',borderRadius:8}}>{darkMode?'☀️':'🌙'}</button>
      </div>
      <div className="card" style={{padding:28,borderRadius:16,boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <h2 style={{textAlign:'center',marginBottom:20}}>{isLogin?'Welcome Back':'Create Account'}</h2>
        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:12}}>
          {!isLogin&&<input required placeholder="Full Name" value={form.fullName} onChange={e=>f('fullName',e.target.value)} style={S.input}/>}
          <input required type="email" placeholder="Email" value={form.email} onChange={e=>f('email',e.target.value)} style={S.input}/>
          <input required type="password" placeholder="Password (min 6)" minLength={6} value={form.password} onChange={e=>f('password',e.target.value)} style={S.input}/>
          {!isLogin&&<select value={form.role} onChange={e=>f('role',e.target.value)} style={S.input}><option value="student">Student</option><option value="teacher">Teacher</option></select>}
          <button type="submit" disabled={busy} style={{...S.btn(),marginTop:8,opacity:busy?.6:1}}>{busy?'Please wait...':isLogin?'Login':'Register'}</button>
        </form>
        <p style={{textAlign:'center',marginTop:16,fontSize:14}}>{isLogin?"No account? ":"Have account? "}<span onClick={()=>{setIsLogin(!isLogin);setMsg('')}} style={{color:'#667eea',cursor:'pointer',fontWeight:700}}>{isLogin?'Register':'Login'}</span></p>
        {msg&&<p className={`msg ${msg.startsWith('❌')?'msg-err':'msg-ok'}`} style={{marginTop:16,textAlign:'center'}}>{msg}</p>}
      </div>
    </div>
  </div>
}

function Header({profile,darkMode,setDarkMode}){
  return<header style={{background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',padding:'14px 24px',color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 4px 12px rgba(0,0,0,.15)'}}>
    <div><h2 style={{margin:0,fontSize:22,color:'#fff'}}>📚 AssignHub</h2><p style={{margin:'2px 0 0',opacity:.85,fontSize:13,color:'#fff'}}>{profile.full_name} • {profile.role.toUpperCase()}</p></div>
    <div style={{display:'flex',gap:12,alignItems:'center'}}>
      {profile.role==='student'&&<div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.2)',padding:'6px 12px',borderRadius:8}}><Star size={16} fill="#fff" color="#fff"/><span style={{fontWeight:700,color:'#fff'}}>{profile.points||0}</span></div>}
      <button onClick={()=>setDarkMode(!darkMode)} style={{background:'rgba(255,255,255,.2)',border:'none',cursor:'pointer',fontSize:18,color:'#fff',padding:'6px 12px',borderRadius:8}}>{darkMode?'☀️':'🌙'}</button>
      <button onClick={()=>supabase.auth.signOut()} style={{background:'rgba(255,255,255,.2)',border:'none',padding:'6px 14px',borderRadius:8,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600}}><LogOut size={15}/>Logout</button>
    </div>
  </header>
}

/* ==================== ADMIN ==================== */
function AdminDashboard(){
  const[tab,setTab]=useState('pending')
  const[users,setUsers]=useState([])
  const[courses,setCourses]=useState([])
  const[teachers,setTeachers]=useState([])
  const[msg,setMsg]=useState('')
  const[nc,setNc]=useState({name:'',code:'',description:'',teacher_id:''})
  /* FIX #3: separate state for reports so courses/users don't collide */
  const[reportTeachers,setReportTeachers]=useState([])
  const[reportStudents,setReportStudents]=useState([])

  useEffect(()=>{load()},[tab])

  async function load(){
    if(tab==='pending'){const{data}=await supabase.from('profiles').select('*').eq('status','pending');setUsers(data||[])}
    else if(tab==='users'){const{data}=await supabase.from('profiles').select('*').neq('role','admin');setUsers(data||[])}
    else if(tab==='courses'){
      const{data}=await supabase.from('courses').select('*,profiles(full_name)')
      const{data:t}=await supabase.from('profiles').select('*').eq('role','teacher').eq('status','approved')
      setCourses(data||[]);setTeachers(t||[])
    }else if(tab==='reports'){
      /* FIX #3: fetch ratings separately to avoid FK ambiguity */
      const{data:allRatings}=await supabase.from('ratings').select('to_user_id,rating')
      const{data:t}=await supabase.from('profiles').select('*').eq('role','teacher')
      const{data:s}=await supabase.from('profiles').select('*').eq('role','student')
      const ratingMap={}
      ;(allRatings||[]).forEach(r=>{
        if(!ratingMap[r.to_user_id])ratingMap[r.to_user_id]=[]
        ratingMap[r.to_user_id].push(r.rating)
      })
      setReportTeachers((t||[]).map(u=>({...u,ratingsArr:ratingMap[u.id]||[]})))
      setReportStudents((s||[]).map(u=>({...u,ratingsArr:ratingMap[u.id]||[]})))
    }
  }

  const avgR=(arr)=>!arr||!arr.length?'0.0':(arr.reduce((a,x)=>a+x,0)/arr.length).toFixed(1)

  async function createCourse(e){
    e.preventDefault()
    if(!nc.teacher_id){setMsg('❌ Select teacher');return}
    const{error}=await supabase.from('courses').insert(nc)
    if(!error){setMsg('✅ Created');setNc({name:'',code:'',description:'',teacher_id:''});load()}else setMsg('❌ '+error.message)
  }

  return<div style={{padding:24,maxWidth:1200,margin:'0 auto'}}>
    <h1>🛡️ Admin Dashboard</h1>
    {msg&&<p className={`msg ${msg.startsWith('❌')?'msg-err':'msg-ok'}`}>{msg}</p>}
    <div className="tabs">
      {['pending','users','courses','reports'].map(t=><button key={t} className={`tab ${tab===t?'on':''}`} onClick={()=>setTab(t)}>{{pending:'👥 Pending',users:'👤 Users',courses:'📚 Courses',reports:'📊 Reports'}[t]}</button>)}
    </div>

    {tab==='pending'&&<div>
      <h2>Pending Approvals</h2>
      {!users.length?<p>No pending users</p>:
      <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
      <tbody>{users.map(u=><tr key={u.id}><td>{u.full_name}</td><td>{u.email}</td><td><span className="badge badge-blue">{u.role}</span></td><td style={{display:'flex',gap:8}}>
        <button style={S.sm('#10b981')} onClick={async()=>{await supabase.from('profiles').update({status:'approved'}).eq('id',u.id);load()}}>✓ Approve</button>
        <button style={S.sm('#ef4444')} onClick={async()=>{await supabase.from('profiles').update({status:'rejected'}).eq('id',u.id);load()}}>✕ Reject</button>
      </td></tr>)}</tbody></table>}
    </div>}

    {tab==='users'&&<div>
      <h2>All Users</h2>
      {!users.length?<p>No users</p>:
      <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Points</th></tr></thead>
      <tbody>{users.map(u=><tr key={u.id}><td>{u.full_name}</td><td>{u.email}</td><td><span className="badge badge-blue">{u.role}</span></td><td><span className={`badge ${u.status==='approved'?'badge-green':'badge-yellow'}`}>{u.status}</span></td><td style={{fontWeight:700}}>{u.points||0}</td></tr>)}</tbody></table>}
    </div>}

    {tab==='courses'&&<div>
      <h2>Create Course</h2>
      <form onSubmit={createCourse} className="card" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
        <input required placeholder="Course Name" value={nc.name} onChange={e=>setNc({...nc,name:e.target.value})} style={S.input}/>
        <input required placeholder="Course Code" value={nc.code} onChange={e=>setNc({...nc,code:e.target.value})} style={S.input}/>
        <select value={nc.teacher_id} onChange={e=>setNc({...nc,teacher_id:e.target.value})} style={{...S.input,gridColumn:'1/-1'}}>
          <option value="">— Select Teacher —</option>
          {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
        <textarea placeholder="Description" value={nc.description} onChange={e=>setNc({...nc,description:e.target.value})} style={{...S.input,gridColumn:'1/-1',minHeight:60}} rows={2}/>
        <button type="submit" style={{...S.btn(),gridColumn:'1/-1'}}>+ Create Course</button>
      </form>
      <h2>All Courses</h2>
      {!courses.length?<p>No courses</p>:
      <div className="grid">{courses.map(c=><div key={c.id} className="card">
        <h3 style={{marginBottom:8}}>{c.name}</h3>
        <p style={{fontSize:13,marginBottom:4}}><strong>Code:</strong> {c.code}</p>
        <p style={{fontSize:13,marginBottom:4}}>{c.description}</p>
        {c.profiles&&<p style={{fontSize:13}}><strong>Teacher:</strong> {c.profiles.full_name}</p>}
        <button style={{...S.sm('#ef4444'),width:'100%',marginTop:12}} onClick={async()=>{if(window.confirm('Delete?')){await supabase.from('courses').delete().eq('id',c.id);load()}}}>🗑 Delete</button>
      </div>)}</div>}
    </div>}

    {/* FIX #3: Reports now use separate state and direct ratings query */}
    {tab==='reports'&&<div>
      <h2>📊 Teacher Performance</h2>
      {!reportTeachers.length?<p>No teachers found</p>:
      <table style={{marginBottom:32}}><thead><tr><th>Teacher</th><th>Avg Rating</th><th>Reviews</th><th>Status</th></tr></thead>
      <tbody>{reportTeachers.map(t=><tr key={t.id}><td>{t.full_name}</td><td>⭐ {avgR(t.ratingsArr)} / 5</td><td>{t.ratingsArr.length}</td><td><span className={`badge ${t.status==='approved'?'badge-green':'badge-yellow'}`}>{t.status}</span></td></tr>)}</tbody></table>}

      <h2>📊 Student Performance</h2>
      {!reportStudents.length?<p>No students found</p>:
      <table><thead><tr><th>Student</th><th>Avg Rating</th><th>Reviews</th><th>Points</th><th>Status</th></tr></thead>
      <tbody>{reportStudents.map(s=><tr key={s.id}><td>{s.full_name}</td><td>⭐ {avgR(s.ratingsArr)} / 5</td><td>{s.ratingsArr.length}</td><td style={{fontWeight:700}}>{s.points||0}</td><td><span className={`badge ${s.status==='approved'?'badge-green':'badge-yellow'}`}>{s.status}</span></td></tr>)}</tbody></table>}
    </div>}
  </div>
}

/* ==================== TEACHER ==================== */
function TeacherDashboard({profile}){
  const[courses,setCourses]=useState([])
  const[sel,setSel]=useState(null)
  const[assignments,setAssignments]=useState([])
  const[subs,setSubs]=useState([])
  const[msg,setMsg]=useState('')
  /* FIX #1 & #4: inline form state instead of prompt() */
  const[showForm,setShowForm]=useState(false)
  const[na,setNa]=useState({title:'',description:'',deadline:'',max_points:100})
  const[attachFile,setAttachFile]=useState(null)
  const[myRating,setMyRating]=useState({avg:'0.0',count:0})

  useEffect(()=>{
    supabase.from('courses').select('*').eq('teacher_id',profile.id).then(({data})=>setCourses(data||[]))
    supabase.from('ratings').select('rating').eq('to_user_id',profile.id).then(({data})=>{
      if(data&&data.length){
        const avg=(data.reduce((s,r)=>s+r.rating,0)/data.length).toFixed(1)
        setMyRating({avg,count:data.length})
      }
    })
  },[])

  async function loadCourse(cid){
    setSel(cid);setShowForm(false)
    const{data:a}=await supabase.from('assignments').select('*').eq('course_id',cid)
    const{data:s}=await supabase.from('submissions').select('*,assignments(title),profiles(full_name,id)').eq('course_id',cid)
    setAssignments(a||[]);setSubs(s||[])
  }

  /* FIX #1: teacher can attach PDF/DOC file to assignment */
  async function createAssignment(e){
    e.preventDefault()
    setMsg('⏳ Creating...')
    let attachment_url=null,attachment_name=null

    if(attachFile){
      const path=`${profile.id}/${Date.now()}-${attachFile.name}`
      const{error:ue}=await supabase.storage.from('assignments').upload(path,attachFile)
      if(ue){setMsg('❌ File upload failed: '+ue.message);return}
      attachment_url=path;attachment_name=attachFile.name
    }

    const{error}=await supabase.from('assignments').insert({
      title:na.title,description:na.description,deadline:na.deadline,
      max_points:parseInt(na.max_points),course_id:sel,teacher_id:profile.id,
      attachment_url,attachment_name
    })
    if(!error){
      setMsg('✅ Assignment created!');setShowForm(false)
      setNa({title:'',description:'',deadline:'',max_points:100});setAttachFile(null)
      loadCourse(sel)
    }else setMsg('❌ '+error.message)
  }

  async function grade(sub){
    const pts=prompt(`Points for ${sub.profiles?.full_name} (max ${assignments.find(a=>a.id===sub.assignment_id)?.max_points||100}):`,sub.points_earned||0)
    if(pts===null)return
    const rating=prompt('Star rating 1-5:','5')
    if(rating===null)return

    const{error}=await supabase.from('submissions').update({status:'accepted',points_earned:parseInt(pts),reviewed_at:new Date().toISOString()}).eq('id',sub.id)
    if(error){setMsg('❌ Error grading');return}

    await supabase.rpc('update_student_points',{p_student_id:sub.student_id,p_points_change:parseInt(pts),p_reason:'Assignment graded',p_submission_id:sub.id})
    await supabase.from('ratings').upsert({from_user_id:profile.id,to_user_id:sub.student_id,submission_id:sub.id,rating:parseInt(rating)},{onConflict:'from_user_id,to_user_id,submission_id'})
    setMsg('✅ Graded & rated!')
    loadCourse(sel)
  }

  async function download(bucket,path){
    const{data,error}=await supabase.storage.from(bucket).createSignedUrl(path,300)
    if(!error)window.open(data.signedUrl,'_blank');else alert('Download error')
  }

  return<div style={{padding:24,maxWidth:1200,margin:'0 auto'}}>
    <h1>👨‍🏫 Teacher Dashboard</h1>
    {msg&&<p className={`msg ${msg.startsWith('❌')?'msg-err':msg.startsWith('⏳')?'msg-err':'msg-ok'}`}>{msg}</p>}

    <div className="card" style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,padding:'14px 20px',borderLeft:'4px solid #f59e0b'}}>
      <span style={{fontSize:28}}>⭐</span>
      <div>
        <p style={{fontWeight:700,fontSize:18,margin:0}}>{myRating.avg} / 5.0</p>
        <p style={{fontSize:12,margin:'2px 0 0',opacity:.7}}>{myRating.count} student {myRating.count===1?'review':'reviews'}</p>
      </div>
    </div>

    {!sel?<div>
      <h2>📚 My Courses</h2>
      {!courses.length?<p>No courses assigned yet</p>:
      <div className="grid">{courses.map(c=><div key={c.id} className="card" style={{cursor:'pointer'}} onClick={()=>loadCourse(c.id)}>
        <h3 style={{marginBottom:6}}>{c.name}</h3>
        <p style={{fontSize:13,marginBottom:4}}><strong>Code:</strong> {c.code}</p>
        <p style={{fontSize:13}}>{c.description}</p>
      </div>)}</div>}
    </div>

    :<div>
      <button onClick={()=>setSel(null)} style={{...S.sm('var(--border)'),color:'var(--text)',marginBottom:16}}>← Back to Courses</button>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:12}}>
        <h2 style={{margin:0}}>📋 Assignments</h2>
        <button onClick={()=>setShowForm(!showForm)} style={S.btn()}>{showForm?'✕ Cancel':'+ New Assignment'}</button>
      </div>

      {/* FIX #4: Enhanced inline assignment form with file upload */}
      {showForm&&<form onSubmit={createAssignment} className="card" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24,borderLeft:'4px solid #667eea'}}>
        <div style={{gridColumn:'1/-1'}}><label style={{fontSize:12,fontWeight:600,marginBottom:4,display:'block'}}>Assignment Title *</label><input required placeholder="e.g. Chapter 5 Homework" value={na.title} onChange={e=>setNa({...na,title:e.target.value})} style={S.input}/></div>
        <div style={{gridColumn:'1/-1'}}><label style={{fontSize:12,fontWeight:600,marginBottom:4,display:'block'}}>Description</label><textarea placeholder="Instructions for students..." value={na.description} onChange={e=>setNa({...na,description:e.target.value})} style={{...S.input,minHeight:70}} rows={3}/></div>
        <div><label style={{fontSize:12,fontWeight:600,marginBottom:4,display:'block'}}>Deadline *</label><input required type="datetime-local" value={na.deadline} onChange={e=>setNa({...na,deadline:e.target.value})} style={S.input}/></div>
        <div><label style={{fontSize:12,fontWeight:600,marginBottom:4,display:'block'}}>Max Points</label><input required type="number" min="1" value={na.max_points} onChange={e=>setNa({...na,max_points:e.target.value})} style={S.input}/></div>
        <div style={{gridColumn:'1/-1'}}>
          <label style={{fontSize:12,fontWeight:600,marginBottom:4,display:'block'}}>📎 Attach File (PDF, DOC, ZIP)</label>
          <div style={{border:'2px dashed var(--border)',borderRadius:8,padding:16,textAlign:'center',background:'var(--bg)',cursor:'pointer',position:'relative'}}>
            {attachFile?<div>
              <p style={{fontWeight:600,color:'#10b981'}}>✅ {attachFile.name}</p>
              <p style={{fontSize:12,marginTop:4}}>({(attachFile.size/1024).toFixed(1)} KB)</p>
              <button type="button" onClick={(e)=>{e.stopPropagation();setAttachFile(null)}} style={{...S.sm('#ef4444'),marginTop:8}}>✕ Remove</button>
            </div>:<label style={{cursor:'pointer',display:'block'}}>
              <p style={{fontSize:28,marginBottom:4}}>📄</p>
              <p style={{fontWeight:600,color:'#667eea'}}>Click to attach file</p>
              <p style={{fontSize:12,marginTop:4}}>PDF, DOC, DOCX, ZIP supported</p>
              <input type="file" accept=".pdf,.doc,.docx,.zip" onChange={e=>setAttachFile(e.target.files?.[0]||null)} style={{display:'none'}}/>
            </label>}
          </div>
        </div>
        <button type="submit" style={{...S.btn(),gridColumn:'1/-1'}}>✅ Create Assignment</button>
      </form>}

      {!assignments.length?<p>No assignments yet</p>:
      <div className="grid" style={{marginBottom:32}}>{assignments.map(a=><div key={a.id} className="card">
        <h4 style={{marginBottom:6}}>{a.title}</h4>
        {a.description&&<p style={{fontSize:13,marginBottom:4}}>{a.description}</p>}
        <p style={{fontSize:12,marginBottom:4}}>📅 {new Date(a.deadline).toLocaleString()}</p>
        <p style={{fontSize:12,marginBottom:4}}>Max: {a.max_points} pts | {a.submission_closed?'🔒 Closed':'✅ Open'} | {a.allow_resubmission?'🔄 Resubmit OK':'❌ No resubmit'}</p>
        {/* FIX #1: show attached file with download */}
        {a.attachment_name&&<p style={{fontSize:12,marginBottom:8}}>📎 <span style={{color:'#667eea',cursor:'pointer',textDecoration:'underline'}} onClick={()=>download('assignments',a.attachment_url)}>{a.attachment_name}</span></p>}
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <button style={S.sm(a.submission_closed?'#10b981':'#f59e0b')} onClick={async()=>{await supabase.from('assignments').update({submission_closed:!a.submission_closed}).eq('id',a.id);loadCourse(sel)}}>{a.submission_closed?'🔓 Open':'🔒 Close'}</button>
          <button style={S.sm(a.allow_resubmission?'#ef4444':'#10b981')} onClick={async()=>{await supabase.from('assignments').update({allow_resubmission:!a.allow_resubmission}).eq('id',a.id);loadCourse(sel)}}>{a.allow_resubmission?'❌ No Resubmit':'✅ Allow'}</button>
          <button style={S.sm('#ef4444')} onClick={async()=>{if(window.confirm('Delete?')){await supabase.from('assignments').delete().eq('id',a.id);loadCourse(sel)}}}>🗑</button>
        </div>
      </div>)}</div>}

      <h2>📤 Student Submissions ({subs.length})</h2>
      {!subs.length?<p>No submissions yet</p>:
      <table>
        <thead><tr><th>Student</th><th>Assignment</th><th>File</th><th>Status</th><th>Points</th><th>Actions</th></tr></thead>
        <tbody>{subs.map(s=><tr key={s.id}>
          <td>{s.profiles?.full_name}</td>
          <td>{s.assignments?.title}</td>
          <td style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.file_name}</td>
          <td><span className={`badge ${s.status==='accepted'?'badge-green':s.status==='rejected'?'badge-red':'badge-yellow'}`}>{s.status}</span></td>
          <td style={{fontWeight:700}}>{s.points_earned||'—'}</td>
          <td style={{display:'flex',gap:6}}>
            <button style={S.sm()} onClick={()=>download('submissions',s.file_path)}>📥 View</button>
            {s.status!=='accepted'&&<button style={S.sm('#10b981')} onClick={()=>grade(s)}>⭐ Grade</button>}
          </td>
        </tr>)}</tbody>
      </table>}
    </div>}
  </div>
}

/* ==================== STUDENT ==================== */
function StudentDashboard({profile}){
  const[tab,setTab]=useState('assignments')
  const[courses,setCourses]=useState([])
  const[enrolled,setEnrolled]=useState([])
  const[assignments,setAssignments]=useState([])
  const[subs,setSubs]=useState([])
  const[msg,setMsg]=useState('')
  /* FIX #2: track which submissions student already rated */
  const[myRatings,setMyRatings]=useState([])

  useEffect(()=>{load()},[tab])

  async function load(){
    if(tab==='courses'){
      const{data:all}=await supabase.from('courses').select('*').eq('status','active')
      const{data:en}=await supabase.from('enrollments').select('course_id').eq('student_id',profile.id)
      setCourses(all||[]);setEnrolled(en?.map(e=>e.course_id)||[])
    }else if(tab==='assignments'){
      const{data:en}=await supabase.from('enrollments').select('course_id').eq('student_id',profile.id)
      const cids=en?.map(e=>e.course_id)||[]
      const{data:a}=cids.length?await supabase.from('assignments').select('*,courses(name)').in('course_id',cids):{data:[]}
      const{data:s}=await supabase.from('submissions').select('*').eq('student_id',profile.id)
      setAssignments(a||[]);setSubs(s||[])
    }else if(tab==='submissions'){
      const{data:s}=await supabase.from('submissions').select('*,assignments(title,teacher_id)').eq('student_id',profile.id)
      /* FIX #2: load student's own ratings to check which are already rated */
      const{data:r}=await supabase.from('ratings').select('submission_id,rating').eq('from_user_id',profile.id)
      setSubs(s||[]);setMyRatings(r||[])
    }
  }

  async function enroll(cid){
    const{error}=await supabase.from('enrollments').insert({course_id:cid,student_id:profile.id})
    if(!error){setMsg('✅ Enrolled!');load()}else setMsg('❌ Already enrolled')
  }

  async function upload(e,aid){
    const file=e.target.files?.[0];if(!file)return
    setMsg('⏳ Uploading...')
    const path=`${profile.id}/${aid}/${Date.now()}-${file.name}`
    const{error:ue}=await supabase.storage.from('submissions').upload(path,file,{upsert:true})
    if(ue){setMsg('❌ Upload failed');return}
    const a=assignments.find(x=>x.id===aid)
    const{error}=await supabase.from('submissions').upsert({assignment_id:aid,student_id:profile.id,file_path:path,file_name:file.name,status:'submitted',course_id:a?.course_id},{onConflict:'assignment_id,student_id'})
    if(!error){setMsg('✅ Submitted!');load()}else setMsg('❌ Error')
  }

  /* FIX #2: after rating, reload so button changes to "✓ Rated" */
  async function rateTeacher(subId,teacherId){
    const r=prompt('Rate teacher (1-5):','5')
    if(!r)return
    const rVal=Math.min(5,Math.max(1,parseInt(r)))
    await supabase.from('ratings').upsert({from_user_id:profile.id,to_user_id:teacherId,submission_id:subId,rating:rVal},{onConflict:'from_user_id,to_user_id,submission_id'})
    setMsg('✅ Teacher rated!')
    load()
  }

  async function downloadAttachment(path){
    const{data,error}=await supabase.storage.from('assignments').createSignedUrl(path,300)
    if(!error)window.open(data.signedUrl,'_blank');else alert('Download error')
  }

  return<div style={{padding:24,maxWidth:1200,margin:'0 auto'}}>
    <h1>👨‍🎓 Student Dashboard</h1>
    {msg&&<p className={`msg ${msg.startsWith('❌')?'msg-err':msg.startsWith('⏳')?'msg-err':'msg-ok'}`}>{msg}</p>}
    <div className="tabs">
      {['courses','assignments','submissions'].map(t=><button key={t} className={`tab ${tab===t?'on':''}`} onClick={()=>setTab(t)}>{{courses:'📚 Courses',assignments:'📝 Assignments',submissions:'📤 My Submissions'}[t]}</button>)}
    </div>

    {tab==='courses'&&<div>
      <h2>Available Courses</h2>
      {!courses.length?<p>No courses available</p>:
      <div className="grid">{courses.map(c=><div key={c.id} className="card">
        <h3 style={{marginBottom:6}}>{c.name}</h3>
        <p style={{fontSize:13,marginBottom:4}}><strong>Code:</strong> {c.code}</p>
        <p style={{fontSize:13,marginBottom:12}}>{c.description}</p>
        {enrolled.includes(c.id)?
          <button disabled style={{...S.btn('#10b981'),width:'100%',opacity:.8}}>✓ Enrolled</button>:
          <button onClick={()=>enroll(c.id)} style={{...S.btn(),width:'100%'}}>Enroll Now</button>}
      </div>)}</div>}
    </div>}

    {tab==='assignments'&&<div>
      <h2>My Assignments</h2>
      {!assignments.length?<p>Enroll in courses to see assignments</p>:
      <div className="grid">{assignments.map(a=>{
        const sub=subs.find(s=>s.assignment_id===a.id)
        return<div key={a.id} className="card" style={{position:'relative'}}>
          {sub&&<span className="badge badge-green" style={{position:'absolute',top:16,right:16}}>✓ SUBMITTED</span>}
          <h4 style={{marginBottom:6,paddingRight:sub?90:0}}>{a.title}</h4>
          <p style={{fontSize:12,marginBottom:4,color:'var(--text)',opacity:.7}}>{a.courses?.name}</p>
          <p style={{fontSize:12,marginBottom:4}}>Max: {a.max_points} pts</p>
          <p style={{fontSize:12,marginBottom:4}}>📅 {new Date(a.deadline).toLocaleString()}</p>
          {/* FIX #1: student can download teacher's attached file */}
          {a.attachment_name&&<button onClick={()=>downloadAttachment(a.attachment_url)} style={{...S.sm(),width:'100%',marginBottom:8}}>📎 Download: {a.attachment_name}</button>}

          {a.submission_closed?<p style={{color:'#ef4444',fontWeight:700,fontSize:13}}>🔒 Submissions Closed</p>:
          sub?<div style={{padding:12,background:'var(--hover)',borderRadius:8,textAlign:'center'}}>
            <p style={{fontWeight:600,marginBottom:4}}>✓ Submitted on {new Date(sub.submitted_at).toLocaleString()}</p>
            {a.allow_resubmission&&<label style={{display:'block',cursor:'pointer',padding:8,marginTop:6,background:'rgba(102,126,234,.1)',borderRadius:6,color:'#667eea',fontWeight:700,fontSize:13}}>
              🔄 Re-submit Work
              <input type="file" onChange={e=>upload(e,a.id)} style={{display:'none'}}/>
            </label>}
          </div>
          :<label style={{display:'block',cursor:'pointer',padding:12,border:'2px dashed #667eea',borderRadius:8,textAlign:'center',color:'#667eea',fontWeight:700,fontSize:13,background:'var(--bg)'}}>
            📤 Upload Work
            <input type="file" onChange={e=>upload(e,a.id)} style={{display:'none'}}/>
          </label>}
        </div>})}</div>}
    </div>}

    {tab==='submissions'&&<div>
      <h2>My Submissions</h2>
      {!subs.length?<p>No submissions yet</p>:
      <table>
        <thead><tr><th>Assignment</th><th>Status</th><th>Points</th><th>Submitted</th><th>Rate Teacher</th></tr></thead>
        <tbody>{subs.map(s=>{
          /* FIX #2: check if already rated this submission */
          const alreadyRated=myRatings.find(r=>r.submission_id===s.id)
          return<tr key={s.id}>
          <td>{s.assignments?.title||'—'}</td>
          <td><span className={`badge ${s.status==='accepted'?'badge-green':s.status==='rejected'?'badge-red':'badge-yellow'}`}>{s.status}</span></td>
          <td style={{fontWeight:700}}>{s.points_earned||'—'}</td>
          <td style={{fontSize:12}}>{s.submitted_at?new Date(s.submitted_at).toLocaleString():'—'}</td>
          <td>{s.status==='accepted'&&s.assignments?.teacher_id?(
            alreadyRated?<span className="badge badge-green">✓ Rated {alreadyRated.rating}⭐</span>
            :<button style={S.sm('#f59e0b')} onClick={()=>rateTeacher(s.id,s.assignments.teacher_id)}>⭐ Rate Teacher</button>
          ):'—'}</td>
        </tr>})}</tbody>
      </table>}
    </div>}
  </div>
}

createRoot(document.getElementById('root')).render(<App/>)
