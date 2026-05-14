import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid } from 'recharts';
import { create } from 'zustand';
import './styles.css';

type Transfer = { id: string; wallet: string; amount: number; asset: string; status: 'queued'|'signing'|'broadcasted'|'confirmed' };
const useStore = create<{queue: Transfer[]; selected?: Transfer; setSelected:(t?:Transfer)=>void; step:number; tick:()=>void}>((set)=>({
  queue: Array.from({length:8}).map((_,i)=>({id:`TR-${2300+i}`, wallet:`0x${(i+10).toString(16).padStart(40,'0')}`, amount:1400+i*220, asset:'USDC', status:'queued'})),
  selected: undefined,
  step: 0,
  setSelected: (selected)=>set({selected}),
  tick: ()=>set((s)=>({step:s.step+1, queue:s.queue.map((q,idx)=>({ ...q, status: s.step>idx+3?'confirmed':s.step>idx+2?'broadcasted':s.step>idx+1?'signing':'queued' }))}))
}));

const qc = new QueryClient();
const fakeFetch = async () => ({
  treasury: [
    { n: 'Mon', value: 4200000 },{ n: 'Tue', value: 4650000 },{ n: 'Wed', value: 4400000 },{ n: 'Thu', value: 4910000 },{ n: 'Fri', value: 5080000 }
  ],
  alloc: [{ name:'Stablecoins', value:46 },{ name:'L1', value:31 },{ name:'L2', value:15 },{ name:'Fiat', value:8 }],
  signers: [{name:'MPC-A', actions:38},{name:'MPC-B', actions:31},{name:'Ops-HSM', actions:18}]
});

function Dashboard(){
  const {data, isLoading} = useQuery({queryKey:['treasury'], queryFn: fakeFetch, refetchInterval: 3500});
  const {queue, selected, setSelected, tick} = useStore();
  React.useEffect(()=>{ const id=setInterval(tick,2200); return ()=>clearInterval(id); },[tick]);
  const execute = useMutation({mutationFn: async(id:string)=>id});

  return <div className='min-h-screen p-4 md:p-6 bg-slate-950 text-slate-100'>
    <div className='grid grid-cols-12 gap-4'>
      <aside className='col-span-12 lg:col-span-2 glass p-4 rounded-2xl'>Responsive Nav</aside>
      <main className='col-span-12 lg:col-span-10 space-y-4'>
        <section className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {['Treasury TVL','$5.08M','Signer Throughput 87 tx/h'].map((t,i)=><motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className='glass p-4 rounded-2xl'>{t}</motion.div>)}
        </section>
        <section className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
          <article className='glass p-4 rounded-2xl xl:col-span-2 h-72'>{isLoading?<div className='skeleton h-full'/>:<ResponsiveContainer><AreaChart data={data?.treasury}><XAxis dataKey='n'/><YAxis/><Tooltip/><Area dataKey='value' stroke='#38bdf8' fill='#0ea5e980' /></AreaChart></ResponsiveContainer>}</article>
          <article className='glass p-4 rounded-2xl h-72'>{isLoading?<div className='skeleton h-full'/>:<ResponsiveContainer><PieChart><Pie data={data?.alloc} dataKey='value'>{['#6366f1','#22d3ee','#a78bfa','#f59e0b'].map((c)=> <Cell key={c} fill={c} />)}</Pie></PieChart></ResponsiveContainer>}</article>
        </section>
        <section className='glass p-4 rounded-2xl'>
          <h3 className='font-semibold mb-3'>Transfer Queue Monitoring Center</h3>
          <div className='grid md:grid-cols-2 gap-2'>{queue.map(t=><button key={t.id} className='text-left border border-white/10 rounded-xl p-3 hover:bg-white/5' onClick={()=>setSelected(t)}>{t.id} · {t.amount} {t.asset} · {t.status}</button>)}</div>
        </section>
        <section className='grid md:grid-cols-2 gap-4'>
          <article className='glass rounded-2xl p-4 h-64'><h3>Signer activity monitor</h3>{isLoading?<div className='skeleton h-52 mt-2'/>:<ResponsiveContainer><BarChart data={data?.signers}><CartesianGrid strokeDasharray='3 3' stroke='#475569'/><XAxis dataKey='name'/><YAxis/><Tooltip/><Bar dataKey='actions' fill='#14b8a6'/></BarChart></ResponsiveContainer>}</article>
          <article className='glass rounded-2xl p-4'><h3>Audit log explorer</h3><ul className='text-sm space-y-2 mt-2'>{queue.slice(0,6).map((q)=><li key={q.id}>[{q.status}] {q.id} approved by signer quorum</li>)}</ul></article>
        </section>
      </main>
    </div>

    <Dialog.Root open={Boolean(selected)} onOpenChange={(o)=>!o&&setSelected(undefined)}>
      <Dialog.Portal><Dialog.Overlay className='fixed inset-0 bg-black/60'/><Dialog.Content className='fixed inset-0 md:inset-auto md:right-8 md:top-12 md:w-[560px] glass p-6 rounded-2xl'>
        <Dialog.Title className='text-lg font-semibold'>Transfer queue modal</Dialog.Title>
        {selected && <>
        <p className='mt-2 text-sm opacity-80'>Wallet detail page: {selected.wallet}</p>
        <ol className='mt-4 space-y-2 text-sm'><li>1. Validate</li><li>2. Simulate</li><li>3. Gas estimate</li><li>4. Sign</li><li>5. Broadcast</li><li>6. Confirm</li></ol>
        <button className='mt-4 px-3 py-2 bg-cyan-500 rounded-lg' onClick={()=>execute.mutate(selected.id)}>Execute transfer (optimistic)</button>
        <div className='mt-4 text-xs opacity-70'>Transaction explorer drawer · live websocket updates</div>
        </>}
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  </div>;
}

createRoot(document.getElementById('app')!).render(<React.StrictMode><QueryClientProvider client={qc}><Dashboard /></QueryClientProvider></React.StrictMode>);
