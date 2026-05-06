<script lang="ts">
  import { appState } from "$lib/store.svelte";

  let toast = $state<{ message: string; visible: boolean }>({ message: "", visible: false });

  function showToast(message: string) {
    toast = { message, visible: true };
    setTimeout(() => {
      toast.visible = false;
    }, 2000);
  }

  // Reactive Total Calculation
  let totalHours = $derived(
    appState.activeTable?.tasks.reduce((total, group) => {
      return total + group.items.reduce((sum, item) => sum + (item.hours || 0), 0);
    }, 0) || 0
  );

  // Auto-save on deep changes
  $effect(() => {
    if (appState.activeTable) {
        // Read to track dependencies
        JSON.stringify(appState.activeTable);
        appState.save();
    }
  });

  // Function to copy table to clipboard
  async function copyTable() {
    const originalTable = document.getElementById("budget-table");
    if (!originalTable) return;
    
    // Create a clone to clean up before copying
    const table = originalTable.cloneNode(true) as HTMLTableElement;

    // 1. Remove hidden elements that are NOT <tr> rows (e.g. delete buttons)
    const hiddenNonRows = table.querySelectorAll('.print\\:hidden:not(tr)');
    hiddenNonRows.forEach(el => el.remove());

    // 2. Replace inputs with their actual values
    const originalInputs = originalTable.querySelectorAll('input');
    const clonedInputs = table.querySelectorAll('input');
    clonedInputs.forEach((input, index) => {
      const val = (originalInputs[index] as HTMLInputElement).value;
      const span = document.createElement('span');
      span.textContent = val;
      if (input.parentNode) {
        input.parentNode.replaceChild(span, input);
      }
    });

    // 3. Replace contenteditable divs with plain text
    const originalEditables = originalTable.querySelectorAll('[contenteditable]');
    const clonedEditables = table.querySelectorAll('[contenteditable]');
    clonedEditables.forEach((el, index) => {
      const val = originalEditables[index].textContent || '';
      const span = document.createElement('span');
      span.textContent = val;
      if (el.parentNode) {
        el.parentNode.replaceChild(span, el);
      }
    });

    // 4. Remove hidden <tr> rows, but first adjust rowspan counts so
    //    merged cells stay correct.
    let allRows = Array.from(table.querySelectorAll('tr'));
    const hiddenRows = Array.from(table.querySelectorAll('tr.print\\:hidden'));

    hiddenRows.forEach(hiddenRow => {
      const hiddenRowIdx = allRows.indexOf(hiddenRow as HTMLTableRowElement);
      if (hiddenRowIdx === -1) return;

      // Walk backwards to find cells with rowspan that covers this row
      for (let r = hiddenRowIdx - 1; r >= 0; r--) {
        const cells = Array.from(allRows[r].children) as HTMLTableCellElement[];
        cells.forEach(cell => {
          if (cell.rowSpan > 1 && r + cell.rowSpan > hiddenRowIdx) {
            cell.rowSpan--;
          }
        });
      }
      hiddenRow.remove();
    });

    // 5. Collapse task header rows
    allRows = Array.from(table.querySelectorAll('tr'));
    const headerRowsToRemove: HTMLTableRowElement[] = [];

    allRows.forEach((row, idx) => {
      const cells = Array.from(row.children) as HTMLTableCellElement[];
      if (
        cells.length === 4 &&
        cells[0].rowSpan > 1 &&
        cells[3].rowSpan > 1 &&
        !cells[1].textContent?.trim() &&
        !cells[2].textContent?.trim()
      ) {
        const nextRow = allRows[idx + 1];
        if (!nextRow) return;

        cells[0].rowSpan--;
        cells[3].rowSpan--;
        nextRow.insertBefore(cells[0], nextRow.firstChild);
        nextRow.appendChild(cells[3]);
        headerRowsToRemove.push(row);
      }
    });
    headerRowsToRemove.forEach(row => row.remove());

    // 6. CLEANUP STYLES FOR EXCEL/SHEETS
    // Remove all background classes and set explicit colors
    const allElements = table.querySelectorAll('*');
    allElements.forEach(el => {
      const element = el as HTMLElement;
      // Remove classes that might cause issues (especially bg-*)
      element.className = element.className
        .split(' ')
        .filter(c => !c.startsWith('bg-') && !c.startsWith('text-') && !c.startsWith('shadow-') && !c.startsWith('border-'))
        .join(' ');
      
      // Reset background and ensure text is visible (black)
      element.style.backgroundColor = 'transparent';
      element.style.color = '#000000';
      element.style.border = '1px solid #e5e7eb';
      element.style.padding = '8px';
    });

    // Set legacy table attributes for Excel
    table.setAttribute('border', '1');
    table.setAttribute('cellpadding', '4');
    table.setAttribute('cellspacing', '0');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.backgroundColor = '#ffffff';

    // 7. COPY TO CLIPBOARD USING MODERN API
    try {
      const blob = new Blob([table.outerHTML], { type: 'text/html' });
      const textBlob = new Blob([table.innerText], { type: 'text/plain' });
      const data = [new ClipboardItem({ 
        'text/html': blob,
        'text/plain': textBlob
      })];
      
      await navigator.clipboard.write(data);
      showToast("Copied to clipboard!");
    } catch (err) {
      console.error(err);
      // Fallback for older browsers
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.appendChild(table);
      document.body.appendChild(container);

      const range = document.createRange();
      const selection = window.getSelection();
      if (selection) {
        range.selectNode(table);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
      }
      document.body.removeChild(container);
      showToast("Copied to clipboard!");
    }
  }
  
  // Helper to add a new row
  function addRow(groupIndex: number) {
      if (appState.activeTable) {
          appState.activeTable.tasks[groupIndex].items.push({ name: "New Activity", hours: 0 });
          appState.save();
      }
  }

  function addTask() {
      if (appState.activeTable) {
          appState.activeTable.tasks.push({
              id: Math.random().toString(36).substring(2, 9),
              name: "New Task",
              items: [{ name: "Investigation", hours: 0 }]
          });
          appState.save();
      }
  }

  function deleteTask(groupIndex: number) {
      if (appState.activeTable) {
          appState.activeTable.tasks.splice(groupIndex, 1);
          appState.save();
      }
  }

  function deleteRow(groupIndex: number, itemIndex: number) {
      if (appState.activeTable) {
          appState.activeTable.tasks[groupIndex].items.splice(itemIndex, 1);
          appState.save();
      }
  }
</script>

<div class="p-4 max-w-[1400px] mx-auto font-sans text-[var(--text-primary)] min-h-screen">
  
  {#if toast.visible}
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-[fadeIn_0.2s_ease-out]">
      <div class="bg-[var(--bg-elevated)] text-[var(--text-primary)] px-4 py-2 rounded-lg shadow-lg border border-[var(--border-subtle)] text-sm font-medium">
        {toast.message}
      </div>
    </div>
  {/if}
  
  {#if appState.activeTable}
  <div class="sticky top-0 z-30 bg-[var(--bg-primary)] pt-4 pb-2 border-b border-[var(--border-subtle)]">
    <div class="flex justify-between items-end">
    <div class="flex-1 pr-4 group">
      <input 
        class="text-xl font-semibold text-[var(--text-primary)] bg-transparent border-b border-transparent focus:border-[var(--accent-primary)]/30 focus:outline-none w-full transition-all pb-0.5"
        bind:value={appState.activeTable.name}
      />
      <p class="text-[10px] text-[var(--text-tertiary)] mt-0.5 font-medium tracking-wide uppercase opacity-70">Interactive Estimate Engine / Copy-Ready for Excel</p>
    </div>
    <div class="flex gap-2 shrink-0 mb-1">
        <button 
        onclick={addTask}
        class="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white px-4 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95"
        >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        Add Section
        </button>
        <button 
        onclick={copyTable}
        class="bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#f5f5f7] px-4 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95"
        >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
        Export
        </button>
    </div>
    </div>
  </div>

  <div class="rounded-xl w-full glass-card overflow-hidden">
    <div class="max-h-[calc(100vh-110px)] overflow-y-auto">
    <table id="budget-table" class="w-full border-collapse text-[13px]">
      <thead class="sticky top-0 z-20">
        <tr class="bg-[var(--bg-secondary)] text-left text-[var(--text-secondary)] uppercase tracking-[0.15em] text-[10px] font-semibold">
          <th class="py-2.5 px-4 border-b border-[var(--border-subtle)] w-1/3">Items</th>
          <th class="py-2.5 px-4 border-b border-[var(--border-subtle)] w-1/3">Breakdown</th>
          <th class="py-2.5 px-2 border-b border-[var(--border-subtle)] w-20 text-center">Hours</th>
          <th class="py-2.5 w-20 text-center bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {#each appState.activeTable.tasks as group, groupIndex}
          <!-- Task Header Row -->
          <tr 
            class="font-semibold border-b border-[var(--border-subtle)] group/task bg-transparent reveal"
            style="animation-delay: {groupIndex * 0.1}s"
          >
            <td class="p-2 relative align-top" rowspan={group.items.length + 2}>
                <div class="absolute left-1 top-2 hidden group-hover/task:block print:hidden z-10">
                    <button onclick={() => deleteTask(groupIndex)} class="text-[var(--accent-red)]/60 hover:text-[var(--accent-red)] p-1 transition-colors" title="Remove Cluster">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
                <div 
                    contenteditable 
                    bind:innerHTML={group.name} 
                    class="outline-none min-h-[1.2em] text-[var(--text-primary)] font-semibold focus:text-[var(--accent-primary)] transition-colors pl-4 text-sm leading-tight"
                ></div>
            </td>
            <td class="py-1"></td> <td class="py-1"></td> 
            <td class="p-2 text-center bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold text-base" rowspan={group.items.length + 2}>
              {(group.items.reduce((sum, i) => sum + (i.hours || 0), 0)).toFixed(1)}
            </td>
          </tr>

          {#each group.items as item, itemIndex}
            <tr class="hover:bg-[var(--bg-secondary)]/50 border-b border-[var(--border-subtle)] transition-colors group/row">
              <td class="py-1.5 px-4 relative">
                  <input 
                    class="w-full bg-transparent focus:outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-xs font-medium" 
                    bind:value={item.name} 
                  />
                  <div class="absolute -right-4 top-1/2 -translate-y-1/2 print:hidden z-10 opacity-0 group-hover/row:opacity-100 transition-all scale-75">
                    <button onclick={() => deleteRow(groupIndex, itemIndex)} class="text-[var(--text-tertiary)] hover:text-[var(--accent-red)] p-1" title="Remove Item">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
              </td>
              
              <td class="py-1.5 px-2 text-center">
                <input 
                  type="number" 
                  step="0.5" 
                  class="w-12 text-center text-[var(--text-primary)] focus:outline-none text-xs font-semibold transition-colors"
                  bind:value={item.hours} 
                />
              </td>
            </tr>
          {/each}
            
            <tr class="print:hidden group/add hover:bg-[var(--bg-secondary)]/50 transition-colors border-b border-[var(--border-subtle)]">
                <td colspan="2" class="p-1 px-4">
                    <button 
                        onclick={() => addRow(groupIndex)}
                        class="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] flex items-center gap-1 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                        </svg>
                        Append Item
                    </button>
                </td>
            </tr>
        {/each}

        <!-- Grand Total Row -->
        </tbody>
        <tfoot class="sticky bottom-0 z-20">
        <tr class="bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold border-t-2 border-[var(--accent-primary)]/30">
          <td class="py-3 px-4 text-right text-xs tracking-[0.2em] text-[var(--text-secondary)] uppercase" colspan="3">Total Hours</td>
          <td class="py-3 px-4 text-center bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xl">{totalHours.toFixed(1)}</td>
        </tr>
        </tfoot>
    </table>
    </div>
  </div>
  {:else if appState.loaded}
    <div class="text-center py-32 relative">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--accent-primary)]/5 blur-[80px] rounded-full pointer-events-none"></div>
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass-card mb-6 border-[var(--border-subtle)] relative z-10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        </div>
        <h2 class="text-xl font-semibold text-[var(--text-primary)] mb-2 relative z-10">No Active Estimates</h2>
        <p class="text-sm text-[var(--text-secondary)] mb-8 relative z-10 max-w-xs mx-auto">Select an existing project from the matrix or initialize a fresh estimation cluster.</p>
        <button 
            onclick={() => appState.addTable('New Sprint')}
            class="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white px-8 py-3 rounded-xl font-medium transition-all active:scale-95"
        >
            Initialize Matrix
        </button>
    </div>
  {/if}
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, 10px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  input[type=number]::-webkit-inner-spin-button, 
  input[type=number]::-webkit-outer-spin-button { 
    -webkit-appearance: none; 
    margin: 0; 
  }
</style>
