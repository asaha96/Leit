import { DatabaseService } from './database';
import type { Deck, Card } from '@/types/database';

export interface CSVRow {
  front: string;
  back: string;
  hint?: string;
  answers?: string;
  tags?: string;
}

export class DeckImporter {
  static async importFromCSV(
    title: string,
    csvData: CSVRow[],
    source: string = 'csv-import'
  ): Promise<{ deck: Deck | null; cards: Card[] }> {
    // Create deck
    const deck = await DatabaseService.createDeck({
      title,
      tags: [],
      source
    });

    if (!deck) {
      return { deck: null, cards: [] };
    }

    // Create cards
    const cardsToCreate = csvData.map(row => ({
      deck_id: deck.id,
      front: row.front.trim(),
      back: row.back.trim(),
      hints: row.hint ? [row.hint.trim()] : [],
      answers: row.answers ? 
        row.answers.split('|').map(a => a.trim()).filter(Boolean) : 
        [row.back.trim()],
      tags: row.tags ? 
        row.tags.split(',').map(t => t.trim()).filter(Boolean) : 
        [],
      media_refs: []
    }));

    const cards = await DatabaseService.createCards(cardsToCreate);

    return { deck, cards };
  }

  static parseCSVText(csvText: string): CSVRow[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: CSVRow = {
        front: '',
        back: ''
      };

      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header) {
          case 'front':
            row.front = value;
            break;
          case 'back':
            row.back = value;
            break;
          case 'hint':
            row.hint = value;
            break;
          case 'answers':
            row.answers = value;
            break;
          case 'tags':
            row.tags = value;
            break;
        }
      });

      if (row.front && row.back) {
        rows.push(row);
      }
    }

    return rows;
  }

  // TODO: Implement CrowdAnki JSON import
  static async importFromCrowdAnki(jsonData: any): Promise<{ deck: Deck | null; cards: Card[] }> {
    // Placeholder for future CrowdAnki import
    console.log('CrowdAnki import not yet implemented:', jsonData);
    return { deck: null, cards: [] };
  }
}