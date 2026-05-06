<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
    import { appState } from '$lib/store.svelte';
    import { onMount } from 'svelte';

	let { children } = $props();

    onMount(() => {
        appState.load();
    });
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex h-screen w-full bg-[#0a0a0c] overflow-hidden text-slate-200">
    <!-- Sidebar -->
    <aside class="w-56 bg-[#111114] flex flex-col h-full shrink-0 border-r border-white/5 shadow-xl">
        <div class="p-4 mb-2">
            <div class="flex items-center gap-2 px-1 mb-6">
                <div class="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                </div>
                <span class="font-bold text-lg tracking-tight group">
                    <span class="text-gradient font-extrabold uppercase tracking-widest text-sm">HY</span>
                    <span class="text-slate-400 font-light">ESTIMATE</span>
                </span>
            </div>

            <button 
                class="w-full bg-gradient-accent hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 text-sm" 
                onclick={() => appState.addTable('New Sprint')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                New Table
            </button>
        </div>
        
        <div class="px-3 mb-2">
            <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2 mb-2">My Estimates</h3>
            <ul class="flex-1 overflow-y-auto space-y-0.5">
                {#each appState.tables as table}
                    <li>
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_interactive_supports_focus -->
                        <div 
                            role="button"
                            class="w-full text-left px-3 py-1.5 rounded-md flex justify-between items-center cursor-pointer transition-all group {appState.activeTableId === table.id ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-white/5 text-slate-400 border border-transparent'}"
                            onclick={() => appState.setActiveTable(table.id)}
                        >
                            <span class="truncate pr-2 text-xs font-medium">{table.name}</span>
                            <button 
                                class="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity" 
                                title="Delete Table"
                                onclick={(e) => { e.stopPropagation(); appState.deleteTable(table.id); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </li>
                {/each}
            </ul>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 h-full overflow-y-auto bg-[#0a0a0c] relative">
        <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none"></div>
        <div class="relative z-10 h-full">
            {@render children()}
        </div>
    </main>
</div>
