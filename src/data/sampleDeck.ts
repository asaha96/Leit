import { Deck } from '@/types/flashcard';

export const sampleDeck: Deck = {
  id: 'sample-deck-1',
  title: 'Geography Basics',
  tags: ['geography', 'capitals', 'countries'],
  cards: [
    {
      id: 'card-1',
      front: 'What is the capital of France?',
      back: 'Paris',
      hint: 'City of Light',
      answers: ['paris', 'París'],
      tags: ['europe', 'capitals']
    },
    {
      id: 'card-2',
      front: 'Which planet is known as the Red Planet?',
      back: 'Mars',
      hint: 'Named after the Roman god of war',
      answers: ['mars'],
      tags: ['astronomy', 'planets']
    },
    {
      id: 'card-3',
      front: 'What is the largest ocean on Earth?',
      back: 'Pacific Ocean',
      hint: 'It covers about 46% of the water surface',
      answers: ['pacific ocean', 'pacific', 'the pacific ocean'],
      tags: ['geography', 'oceans']
    },
    {
      id: 'card-4',
      front: 'What is the chemical symbol for gold?',
      back: 'Au',
      hint: 'From the Latin word "aurum"',
      answers: ['au', 'Au'],
      tags: ['chemistry', 'elements']
    },
    {
      id: 'card-5',
      front: 'In which year did World War II end?',
      back: '1945',
      hint: 'The year the atomic bombs were dropped',
      answers: ['1945', 'nineteen forty-five'],
      tags: ['history', 'world war']
    }
  ]
};