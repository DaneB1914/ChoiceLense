import { DecisionInput } from '../types/decision';

export interface DecisionPreset {
  id: string;
  category: 'Career' | 'Finance & Living' | 'Tech & Business' | 'Personal';
  title: string;
  tagline: string;
  input: DecisionInput;
}

export const PRESET_DECISIONS: DecisionPreset[] = [
  {
    id: 'career-startup-vs-corp',
    category: 'Career',
    title: 'Startup Founding Engineer vs BigTech Staff Role',
    tagline: 'High equity upside & autonomy vs top-tier compensation & stability',
    input: {
      title: 'Join Seed-Stage AI Startup as Founding Engineer vs Stay Senior Staff at Tier-1 Tech Company',
      context: 'Received an offer with 1.5% equity at a promising Seed-stage enterprise AI startup backed by top VCs. Current role pays $380k total comp with 40-hour weeks, but learning velocity has plateaued and promotion cycles are slowing.',
      options: [
        'Join Seed-Stage Startup as Founding Engineer',
        'Stay as Senior Staff Engineer at Current Tech Firm',
      ],
      priorities: [
        'Steep learning curve and ownership',
        'Long-term wealth creation upside',
        'Work-life sustainability & family balance',
        'Marketable leadership credential',
      ],
      riskTolerance: 'high',
      timeHorizon: '1-2 years',
    },
  },
  {
    id: 'finance-buy-vs-rent',
    category: 'Finance & Living',
    title: 'Buy Home ($950k) vs Rent & Invest in Index Funds',
    tagline: 'Rooted real estate equity vs liquidity, flexibility, and stock compounding',
    input: {
      title: 'Purchase a $950,000 Single Family Home vs Continue Renting for $3,200/mo & Invest Surplus',
      context: 'Saved $220,000 in liquid assets. Mortgage rates are ~6.4%. Buying locks in housing costs, provides yard and stability for 5+ years, but ties up nearly all savings in down payment and property taxes/maintenance.',
      options: [
        'Buy $950k Home with 20% Down Payment',
        'Rent at $3,200/month and Invest Remaining Capital in Broad Index Funds',
      ],
      priorities: [
        'Total net worth in 10 years',
        'Lifestyle stability & neighborhood roots',
        'Liquidity and flexibility to relocate if career changes',
        'Predictable monthly expenses',
      ],
      riskTolerance: 'moderate',
      timeHorizon: '5+ years',
    },
  },
  {
    id: 'tech-stack-monolith-vs-microservices',
    category: 'Tech & Business',
    title: 'Modular Monolith vs Distributed Microservices',
    tagline: 'Fast deployment velocity & simpler dev ops vs autonomous team scaling',
    input: {
      title: 'Architect Next-Gen Core Platform as a Modular Monolith vs Distributed Microservices',
      context: 'Team is 14 engineers scaling to 30 over the next 18 months. Currently hitting friction with shared database deployments, but worried microservices will introduce distributed transactions, RPC overhead, and operational sprawl.',
      options: [
        'Well-Encapsulated Modular Monolith with Event Bus',
        'Independent Domain-Driven Microservices with gRPC & Kafka',
      ],
      priorities: [
        'Speed of shipping features to users',
        'Operational simplicity for small on-call team',
        'Zero-downtime deployability and rollback ease',
        'Team autonomy as headcount doubles',
      ],
      riskTolerance: 'moderate',
      timeHorizon: '1-2 years',
    },
  },
  {
    id: 'life-relocate-abroad',
    category: 'Personal',
    title: 'Relocate Overseas for 2 Years vs Stay in Current City',
    tagline: 'Life-changing international perspective vs leaving established community',
    input: {
      title: 'Accept 2-Year International Transfer to Amsterdam vs Deepen Community in Home City',
      context: 'Partner is supportive and can work remotely. Company covers visa and partial relocation. However, friends, aging parents, and local routine are comfortable and grounding here.',
      options: [
        'Accept 2-Year European Transfer to Amsterdam',
        'Decline Transfer & Commit to Current City Community',
      ],
      priorities: [
        'Personal adventure and global perspective',
        'Proximity to family and lifelong friendships',
        'Career differentiation & international experience',
        'Mental health and everyday happiness',
      ],
      riskTolerance: 'high',
      timeHorizon: '1-2 years',
    },
  },
];
