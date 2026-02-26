// Auto-number generation system with customizable sequences

export interface NumberSequence {
  prefix: string;
  includeYear: boolean;
  includeMonth: boolean;
  startNumber: number;
  currentNumber: number;
  padding: number; // Number of digits (e.g., 4 for 0001)
  separator: string;
  sample?: string;
}

export interface NumberSequences {
  project: NumberSequence;
  purchaseOrder: NumberSequence;
  vendor: NumberSequence;
  customer: NumberSequence;
  invoice: NumberSequence;
  payment: NumberSequence;
  variationOrder: NumberSequence;
  claim: NumberSequence;
  employee: NumberSequence;
}

const DEFAULT_SEQUENCES: NumberSequences = {
  project: {
    prefix: 'PRJ',
    includeYear: true,
    includeMonth: false,
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    separator: '-',
  },
  purchaseOrder: {
    prefix: 'PO',
    includeYear: true,
    includeMonth: false,
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    separator: '-',
  },
  vendor: {
    prefix: 'VND',
    includeYear: false,
    includeMonth: false,
    startNumber: 1001,
    currentNumber: 1001,
    padding: 4,
    separator: '-',
  },
  customer: {
    prefix: 'CUST',
    includeYear: false,
    includeMonth: false,
    startNumber: 2001,
    currentNumber: 2001,
    padding: 4,
    separator: '-',
  },
  invoice: {
    prefix: 'INV',
    includeYear: true,
    includeMonth: true,
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    separator: '-',
  },
  payment: {
    prefix: 'PAY',
    includeYear: true,
    includeMonth: false,
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    separator: '-',
  },
  variationOrder: {
    prefix: 'VO',
    includeYear: true,
    includeMonth: false,
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    separator: '-',
  },
  claim: {
    prefix: 'CLM',
    includeYear: true,
    includeMonth: false,
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    separator: '-',
  },
  employee: {
    prefix: 'EMP',
    includeYear: false,
    includeMonth: false,
    startNumber: 1001,
    currentNumber: 1001,
    padding: 4,
    separator: '-',
  },
};

const STORAGE_KEY = 'numberSequences';

class NumberGenerator {
  private sequences: NumberSequences;

  constructor() {
    this.sequences = this.loadSequences();
  }

  private loadSequences(): NumberSequences {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error loading number sequences:', e);
      }
    }
    return { ...DEFAULT_SEQUENCES };
  }

  private saveSequences(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sequences));
  }

  private padNumber(num: number, padding: number): string {
    return num.toString().padStart(padding, '0');
  }

  private formatNumber(sequence: NumberSequence, number: number): string {
    const parts: string[] = [sequence.prefix];
    
    if (sequence.includeYear) {
      parts.push(new Date().getFullYear().toString());
    }
    
    if (sequence.includeMonth) {
      parts.push((new Date().getMonth() + 1).toString().padStart(2, '0'));
    }
    
    parts.push(this.padNumber(number, sequence.padding));
    
    return parts.join(sequence.separator);
  }

  generateNumber(type: keyof NumberSequences): string {
    const sequence = this.sequences[type];
    const number = this.formatNumber(sequence, sequence.currentNumber);
    
    // Increment for next time
    sequence.currentNumber++;
    this.saveSequences();
    
    return number;
  }

  // Generate and reserve number (increments counter)
  generateAndReserveNumber(type: keyof NumberSequences): string {
    const sequence = this.sequences[type];
    const number = this.formatNumber(sequence, sequence.currentNumber);
    
    // Increment for next time
    sequence.currentNumber++;
    this.saveSequences();
    
    return number;
  }

  // Just preview the next number without reserving it
  previewNextNumber(type: keyof NumberSequences): string {
    const sequence = this.sequences[type];
    return this.formatNumber(sequence, sequence.currentNumber);
  }

  previewNumber(type: keyof NumberSequences): string {
    const sequence = this.sequences[type];
    return this.formatNumber(sequence, sequence.currentNumber);
  }

  getSequence(type: keyof NumberSequences): NumberSequence {
    return { ...this.sequences[type] };
  }

  updateSequence(type: keyof NumberSequences, sequence: Partial<NumberSequence>): void {
    this.sequences[type] = {
      ...this.sequences[type],
      ...sequence,
    };
    this.saveSequences();
  }

  resetSequence(type: keyof NumberSequences): void {
    this.sequences[type] = { ...DEFAULT_SEQUENCES[type] };
    this.saveSequences();
  }

  getAllSequences(): NumberSequences {
    return { ...this.sequences };
  }

  resetAllSequences(): void {
    this.sequences = { ...DEFAULT_SEQUENCES };
    this.saveSequences();
  }

  // Check if a year/month has changed and reset if configured
  checkAndResetPeriodic(): void {
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const lastCheck = localStorage.getItem('lastNumberCheck');
    
    if (!lastCheck || !lastCheck.startsWith(currentYear)) {
      // Year has changed, reset yearly sequences
      Object.entries(this.sequences).forEach(([key, sequence]) => {
        if (sequence.includeYear && !sequence.includeMonth) {
          sequence.currentNumber = sequence.startNumber;
        }
      });
      this.saveSequences();
    }
    
    if (!lastCheck || lastCheck !== `${currentYear}-${currentMonth}`) {
      // Month has changed, reset monthly sequences
      Object.entries(this.sequences).forEach(([key, sequence]) => {
        if (sequence.includeMonth) {
          sequence.currentNumber = sequence.startNumber;
        }
      });
      this.saveSequences();
    }
    
    localStorage.setItem('lastNumberCheck', `${currentYear}-${currentMonth}`);
  }
}

// Singleton instance
export const numberGenerator = new NumberGenerator();

// Check for period changes on load
numberGenerator.checkAndResetPeriodic();

// ─── API-backed preview ───────────────────────────────────────────────────────
// Fetches the next number preview from the server's number_sequences table.
// Falls back to the local generator if the API is unavailable.

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api';

export async function previewNextNumber(type: keyof NumberSequences): Promise<string> {
  try {
    const { getAccessToken } = await import('../lib/authClient');
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/sequences/${type}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('API unavailable');
    const json = await res.json();
    if (!json.success) throw new Error('API error');
    // API returns { entity, current } — format using local sequence config
    const counter: number = json.data.current;
    const seq = numberGenerator.getSequence(type);
    const parts: string[] = [seq.prefix];
    const now = new Date();
    if (seq.includeYear) parts.push(now.getFullYear().toString());
    if (seq.includeMonth) parts.push((now.getMonth() + 1).toString().padStart(2, '0'));
    parts.push(counter.toString().padStart(seq.padding, '0'));
    return parts.join(seq.separator);
  } catch {
    // Fallback to local preview
    return numberGenerator.previewNextNumber(type);
  }
}