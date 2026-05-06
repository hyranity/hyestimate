export type Activity = { name: string; hours: number };
export type Task = { id: string; name: string; items: Activity[] };
export type TableData = { id: string; name: string; tasks: Task[] };

const STORAGE_KEY = 'hyestimate-tables';

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

class AppState {
    tables = $state<TableData[]>([]);
    activeTableId = $state<string | null>(null);
    loaded = $state(false);

    load() {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    this.tables = data.tables || [];
                    this.activeTableId = data.activeTableId;
                } catch (e) {
                    console.error("Failed to parse local storage", e);
                }
            }
        }
        
        if (this.tables.length === 0) {
            const newTable = this.createTable('Default Sprint');
            // Adding initial default data for demonstration
            newTable.tasks = [
                {
                    id: generateId(),
                    name: "TASK: Error in updating customer",
                    items: [
                        { name: "Investigation", hours: 6.0 },
                        { name: "Development (Frontend & Backend)", hours: 2.0 },
                        { name: "Testing & Review", hours: 1.5 },
                    ],
                },
                {
                    id: generateId(),
                    name: "GLOBAL SPRINT OPS",
                    items: [
                        { name: "Deployment (Staging & Production)", hours: 24.0 },
                        { name: "Bugfixes & Monitoring", hours: 17.0 },
                    ],
                },
            ];
            this.tables = [newTable];
            this.activeTableId = newTable.id;
            this.save();
        } else if (!this.activeTableId || !this.tables.find(t => t.id === this.activeTableId)) {
            this.activeTableId = this.tables[0].id;
            this.save();
        }
        this.loaded = true;
    }

    save() {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                tables: $state.snapshot(this.tables),
                activeTableId: this.activeTableId
            }));
        }
    }

    createTable(name: string): TableData {
        return {
            id: generateId(),
            name,
            tasks: [
                {
                    id: generateId(),
                    name: "New Task",
                    items: [{ name: "Investigation", hours: 0 }]
                }
            ]
        };
    }

    addTable(name: string) {
        const table = this.createTable(name);
        this.tables.push(table);
        this.activeTableId = table.id;
        this.save();
    }

    setActiveTable(id: string) {
        if (!this.tables.find(t => t.id === id)) return;

        this.activeTableId = id;
        this.save();
    }
    
    deleteTable(id: string) {
        this.tables = this.tables.filter(t => t.id !== id);
        if (this.activeTableId === id) {
            this.activeTableId = this.tables.length > 0 ? this.tables[0].id : null;
        }
        if (this.tables.length === 0) {
            this.addTable('Default Sprint');
        }
        this.save();
    }

    get activeTable(): TableData | null {
        return this.tables.find(t => t.id === this.activeTableId) || null;
    }
}

export const appState = new AppState();
