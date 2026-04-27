export interface User {
  id: string
  name: string
  title: string
  codes: string
  color: string
  avatar: string
}

export interface Activity {
  id: string
  userId: string
  category: string
  title: string
  points: number
  year: number
  quarter: number
}

function av(img: number) { return `https://i.pravatar.cc/128?img=${img}` }

export const CATEGORIES = [
  'Public Speaking',
  'Education',
  'University Partnership',
] as const

export const POINTS: Record<string, number> = {
  'Public Speaking':       30,
  'Education':             20,
  'University Partnership': 25,
}

// Pool of realistic, engineering-relevant activity titles per category
const TITLES: Record<string, string[]> = {
  'Public Speaking': [
    'Tech Talk: Scaling Microservices in Production',
    'Conference: The Future of DevOps Pipelines',
    'Meetup: Testing Strategies for Distributed Systems',
    'Webinar: Kubernetes for Engineering Teams',
    'Panel: Building Remote Engineering Culture',
    'Lightning Talk: Zero-Downtime Deployment Strategies',
    'Podcast: Engineering Culture at Scale',
    'Talk: Observability in Distributed Systems',
    'Tech Talk: GraphQL vs REST — Choosing the Right API',
    'Presentation: Event-Driven Architecture in Practice',
    'Conference Talk: Building Resilient APIs at Scale',
    'Meetup: Frontend Performance — Beyond the Basics',
    'Keynote: Security in Modern Web Applications',
    'Talk: Database Indexing and Query Optimization',
    'Presentation: Designing for Failure in Cloud Systems',
  ],
  'Education': [
    'Internal Workshop: Advanced TypeScript Patterns',
    'Mentoring Program: Junior Developer Cohort',
    'Learning Series: Cloud Architecture Fundamentals',
    'Team Training: OWASP Security Best Practices',
    'Documentation Sprint: Engineering Handbook',
    'Workshop: Clean Code and Refactoring Techniques',
    'Brown Bag: Profiling and Performance Tuning',
    'Training: Web Accessibility and Inclusive Design',
    'Workshop: Test-Driven Development in Practice',
    'Knowledge Transfer: Legacy System Migration',
    'Workshop: Docker, Compose and Container Orchestration',
    'Session: Effective Code Review Culture',
    'Workshop: Continuous Delivery and Feature Flags',
    'Training: Introduction to Machine Learning for Engineers',
    'Workshop: System Design for Senior Engineers',
  ],
  'University Partnership': [
    'Guest Lecture: Modern Software Engineering Practices',
    'Hackathon Mentor at Warsaw Technical University',
    'Capstone Project Supervisor — Distributed Systems Team',
    'Industry Talk: Career Paths in Software Engineering',
    'Internship Program Coordination (Summer Cohort)',
    'Research Collaboration: Applied ML in Production Systems',
    'Student Project Code Reviewer',
    'Campus Recruitment Presentation',
    'Co-authored Paper: Consistency Models in Distributed DBs',
    'University Lab Partner: AI Research Initiative',
    'Thesis Defense Committee Member',
    'Guest Workshop for CS Students: Real-World APIs',
    'Open Source Contribution Day for University Students',
    'Industry Advisory Board: CS Curriculum Review',
    'Scholarship Selection Committee Member',
  ],
}

export const USERS: User[] = [
  { id: '1',  name: 'Piotr Kowalski',      title: 'Senior Software Engineer', codes: 'PL.U1.D1.G1',    color: '#3B82F6', avatar: av(11) },  // male
  { id: '2',  name: 'Jakub Wiśniewski',    title: 'Group Manager',            codes: 'PL.U1.G3',       color: '#10B981', avatar: av(12) },  // male
  { id: '3',  name: 'Malika Rahimova',     title: 'Lead QA Engineer',         codes: 'UZ.U1.D1.G1.T1', color: '#8B5CF6', avatar: av(47) },  // female
  { id: '4',  name: 'Aibek Mamytbekov',    title: 'Frontend Developer',       codes: 'KG.U2.D2.G2',    color: '#F59E0B', avatar: av(15) },  // male
  { id: '5',  name: 'Agnieszka Dąbrowska', title: 'Product Manager',          codes: 'PL.U1.G1',       color: '#EF4444', avatar: av(48) },  // female
  { id: '6',  name: 'Sardor Yusupov',      title: 'Backend Engineer',         codes: 'UZ.U2.D1.G2',    color: '#06B6D4', avatar: av(20) },  // male
  { id: '7',  name: 'Ainura Osmonova',     title: 'DevOps Engineer',          codes: 'KG.U1.D3.G1',    color: '#84CC16', avatar: av(56) },  // female
  { id: '8',  name: 'Krzysztof Nowak',     title: 'Data Engineer',            codes: 'PL.U3.D2.G4',    color: '#F97316', avatar: av(32) },  // male
  { id: '9',  name: 'Zulfiya Ergasheva',   title: 'QA Engineer',              codes: 'UZ.U1.D1.T2',    color: '#EC4899', avatar: av(44) },  // female
  { id: '10', name: 'Bakyt Toktorov',      title: 'Tech Lead',                codes: 'KG.U1.D1.G1',    color: '#6366F1', avatar: av(7)  },  // male
]

// Categories per user — ordered to maintain leaderboard ranking
// Points: PS=30, UP=25, Ed=20
//  1  Piotr      10 PS + 8 UP + 8 Ed  = 300+200+160 = 660
//  2  Jakub       6 PS + 5 UP + 5 Ed  = 180+125+100 = 405
//  3  Malika      5 PS + 5 UP + 4 Ed  = 150+125+ 80 = 355
//  4  Aibek       4 PS + 3 UP + 4 Ed  = 120+ 75+ 80 = 275
//  5  Agnieszka   3 PS + 3 UP + 3 Ed  =  90+ 75+ 60 = 225
//  6  Sardor      3 PS + 2 UP + 2 Ed  =  90+ 50+ 40 = 180
//  7  Ainura      2 PS + 2 UP + 2 Ed  =  60+ 50+ 40 = 150
//  8  Krzysztof   2 PS + 1 UP + 2 Ed  =  60+ 25+ 40 = 125
//  9  Zulfiya     1 PS + 1 UP + 1 Ed  =  30+ 25+ 20 =  75
// 10  Bakyt       1 PS + 1 UP + 0 Ed  =  30+ 25      =  55

const USER_CATEGORY_LISTS: Record<string, string[]> = {
  '1':  [
    ...Array(10).fill('Public Speaking'),
    ...Array(8).fill('University Partnership'),
    ...Array(8).fill('Education'),
  ],
  '2':  [
    ...Array(6).fill('Public Speaking'),
    ...Array(5).fill('University Partnership'),
    ...Array(5).fill('Education'),
  ],
  '3':  [
    ...Array(5).fill('Public Speaking'),
    ...Array(5).fill('University Partnership'),
    ...Array(4).fill('Education'),
  ],
  '4':  [
    ...Array(4).fill('Public Speaking'),
    ...Array(3).fill('University Partnership'),
    ...Array(4).fill('Education'),
  ],
  '5':  [
    ...Array(3).fill('Public Speaking'),
    ...Array(3).fill('University Partnership'),
    ...Array(3).fill('Education'),
  ],
  '6':  [
    ...Array(3).fill('Public Speaking'),
    ...Array(2).fill('University Partnership'),
    ...Array(2).fill('Education'),
  ],
  '7':  [
    ...Array(2).fill('Public Speaking'),
    ...Array(2).fill('University Partnership'),
    ...Array(2).fill('Education'),
  ],
  '8':  [
    ...Array(2).fill('Public Speaking'),
    ...Array(1).fill('University Partnership'),
    ...Array(2).fill('Education'),
  ],
  '9':  [
    ...Array(1).fill('Public Speaking'),
    ...Array(1).fill('University Partnership'),
    ...Array(1).fill('Education'),
  ],
  '10': [
    ...Array(1).fill('Public Speaking'),
    ...Array(1).fill('University Partnership'),
  ],
}

// LCG deterministic RNG
function makeLcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

export const ACTIVITIES: Activity[] = (() => {
  const rng = makeLcg(0xCAFE_BABE)
  const result: Activity[] = []
  let id = 0

  // Track used titles per category per user to avoid exact repeats
  const usedIdx: Record<string, Record<string, number>> = {}

  for (const user of USERS) {
    usedIdx[user.id] = {}
    const categories = USER_CATEGORY_LISTS[user.id] ?? []

    for (const category of categories) {
      const pool = TITLES[category]
      // Pick a title, rotating through the pool so each user gets varied titles
      const used = usedIdx[user.id][category] ?? 0
      const titleIdx = (Math.floor(rng() * pool.length) + used) % pool.length
      usedIdx[user.id][category] = (used + 1)

      const year    = rng() < 0.6 ? 2025 : 2024
      const quarter = (Math.floor(rng() * 4) + 1) as 1 | 2 | 3 | 4

      result.push({
        id: String(id++),
        userId: user.id,
        category,
        title: pool[titleIdx],
        points: POINTS[category],
        year,
        quarter,
      })
    }
  }

  return result
})()

export const AVAILABLE_YEARS = ['2025', '2024'] as const
