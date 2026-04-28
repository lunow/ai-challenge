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
  date: string  // ISO "YYYY-MM-DD", within the activity's year+quarter
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

const USER_COLORS = [
  '#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444',
  '#06B6D4','#84CC16','#F97316','#EC4899','#6366F1',
  '#14B8A6','#A855F7','#F43F5E','#22C55E','#EAB308',
  '#0EA5E9','#D946EF','#64748B','#7C3AED','#059669',
]

// [name, title, department]
const RAW_USERS: [string, string, string][] = [
  // ── Poland (1–25) ─────────────────────────────────────────────────────────
  ['Piotr Kowalski',          'Senior Software Engineer',    'PL · Software Engineering'],
  ['Agnieszka Wiśniewska',    'DevOps Engineer',             'PL · DevOps & SRE'],
  ['Krzysztof Nowak',         'Data Engineer',               'PL · Data Engineering'],
  ['Magdalena Szymańska',     'ML Engineer',                 'PL · Machine Learning'],
  ['Michał Wójcik',           'Tech Lead',                   'PL · Engineering Leadership'],
  ['Anna Kowalczyk',          'Backend Engineer',            'PL · Backend Engineering'],
  ['Tomasz Kamiński',         'Frontend Engineer',           'PL · Frontend Engineering'],
  ['Ewelina Lewandowska',     'QA Engineer',                 'PL · Quality Engineering'],
  ['Rafał Zieliński',         'Full Stack Engineer',         'PL · Full Stack Engineering'],
  ['Natalia Mazur',           'Cloud Architect',             'PL · Cloud Architecture'],
  ['Bartosz Krawczyk',        'Security Engineer',           'PL · Security Engineering'],
  ['Marta Piotrowska',        'Site Reliability Engineer',   'PL · DevOps & SRE'],
  ['Kamil Grabowski',         'Platform Engineer',           'PL · Platform Engineering'],
  ['Dominika Jankowska',      'Principal Software Engineer', 'PL · Architecture'],
  ['Szymon Wojciechowski',    'Engineering Manager',         'PL · Engineering Leadership'],
  ['Justyna Kwiatkowska',     'Data Scientist',              'PL · Data Science'],
  ['Łukasz Kaczmarek',        'Infrastructure Engineer',     'PL · Infrastructure'],
  ['Weronika Woźniak',        'Staff Software Engineer',     'PL · Software Engineering'],
  ['Paweł Kozłowski',         'Embedded Systems Engineer',   'PL · Embedded Systems'],
  ['Filip Majewski',          'Systems Engineer',            'PL · Systems Engineering'],
  ['Monika Nowakowska',       'Senior QA Engineer',          'PL · Quality Engineering'],
  ['Grzegorz Jaworski',       'SDET',                        'PL · Quality Engineering'],
  ['Patrycja Chmielewska',    'Solutions Architect',         'PL · Solutions Architecture'],
  ['Artur Wiśniewski',        'Lead Software Engineer',      'PL · Software Engineering'],
  ['Zuzanna Dąbrowska',       'Senior Backend Engineer',     'PL · Backend Engineering'],
  // ── Uzbekistan (26–40) ────────────────────────────────────────────────────
  ['Sardor Yusupov',          'Backend Engineer',            'UZ · Backend Engineering'],
  ['Malika Rahimova',         'Lead QA Engineer',            'UZ · Quality Engineering'],
  ['Jasur Karimov',           'DevOps Engineer',             'UZ · DevOps & SRE'],
  ['Zulfiya Ergasheva',       'QA Engineer',                 'UZ · Quality Engineering'],
  ['Nodir Xasanov',           'Data Engineer',               'UZ · Data Engineering'],
  ['Nodira Toshmatova',       'Frontend Engineer',           'UZ · Frontend Engineering'],
  ['Bobur Nazarov',           'ML Engineer',                 'UZ · Machine Learning'],
  ['Gulnora Ismoilova',       'Software Engineer',           'UZ · Software Engineering'],
  ['Timur Mirzayev',          'Platform Engineer',           'UZ · Platform Engineering'],
  ['Shahnoza Qodirova',       'Systems Engineer',            'UZ · Systems Engineering'],
  ['Aziz Pulatov',            'Senior Software Engineer',    'UZ · Software Engineering'],
  ['Ozoda Razzaqova',         'Data Scientist',              'UZ · Data Science'],
  ['Eldor Sobirov',           'Infrastructure Engineer',     'UZ · Infrastructure'],
  ['Feruza Haydarova',        'Security Engineer',           'UZ · Security Engineering'],
  ['Sanjar Abdullayev',       'Tech Lead',                   'UZ · Engineering Leadership'],
  // ── Kyrgyzstan (41–55) ────────────────────────────────────────────────────
  ['Aibek Mamytbekov',        'Frontend Developer',          'KG · Frontend Engineering'],
  ['Ainura Osmonova',         'DevOps Engineer',             'KG · DevOps & SRE'],
  ['Bakyt Toktorov',          'Tech Lead',                   'KG · Engineering Leadership'],
  ['Nurlan Sydykov',          'Senior Software Engineer',    'KG · Software Engineering'],
  ['Gulmira Abakirova',       'QA Engineer',                 'KG · Quality Engineering'],
  ['Ermek Kojobekov',         'Backend Engineer',            'KG · Backend Engineering'],
  ['Jyldyz Jumaeva',          'Data Engineer',               'KG · Data Engineering'],
  ['Manas Rysbekov',          'Platform Engineer',           'KG · Platform Engineering'],
  ['Aizat Bekturova',         'ML Engineer',                 'KG · Machine Learning'],
  ['Azamat Dzhaksybekov',     'Infrastructure Engineer',     'KG · Infrastructure'],
  ['Bermet Osmonbekova',      'Software Engineer',           'KG · Software Engineering'],
  ['Kuban Jumabaev',          'Security Engineer',           'KG · Security Engineering'],
  ['Zuura Abdykadyrova',      'Solutions Architect',         'KG · Solutions Architecture'],
  ['Mirlan Sultanbekov',      'Staff Software Engineer',     'KG · Software Engineering'],
  ['Daniyar Seitkali',        'Engineering Manager',         'KG · Engineering Leadership'],
  // ── Germany (56–75) ───────────────────────────────────────────────────────
  ['Thomas Müller',           'Principal Software Engineer', 'DE · Architecture'],
  ['Julia Schmidt',           'Senior DevOps Engineer',      'DE · DevOps & SRE'],
  ['Lukas Schneider',         'Platform Engineer',           'DE · Platform Engineering'],
  ['Katharina Fischer',       'Data Scientist',              'DE · Data Science'],
  ['Michael Weber',           'Cloud Architect',             'DE · Cloud Architecture'],
  ['Sarah Meyer',             'AI Engineer',                 'DE · AI Research'],
  ['Andreas Wagner',          'Security Engineer',           'DE · Security Engineering'],
  ['Lena Becker',             'Backend Engineer',            'DE · Backend Engineering'],
  ['Klaus Schulz',            'Embedded Systems Engineer',   'DE · Embedded Systems'],
  ['Sophie Hoffmann',         'Frontend Engineer',           'DE · Frontend Engineering'],
  ['Stefan Schäfer',          'Site Reliability Engineer',   'DE · DevOps & SRE'],
  ['Marie Koch',              'Full Stack Engineer',         'DE · Full Stack Engineering'],
  ['Markus Bauer',            'Systems Engineer',            'DE · Systems Engineering'],
  ['Hannah Richter',          'QA Engineer',                 'DE · Quality Engineering'],
  ['Christian Klein',         'Data Engineer',               'DE · Data Engineering'],
  ['Anna Wolf',               'ML Engineer',                 'DE · Machine Learning'],
  ['Daniel Schröder',         'Solutions Architect',         'DE · Solutions Architecture'],
  ['Emma Neumann',            'Tech Lead',                   'DE · Engineering Leadership'],
  ['Florian Schwarz',         'Engineering Manager',         'DE · Engineering Leadership'],
  ['Leonie Zimmermann',       'Senior Software Engineer',    'DE · Software Engineering'],
  // ── France (76–90) ────────────────────────────────────────────────────────
  ['Pierre Martin',           'Backend Engineer',            'FR · Backend Engineering'],
  ['Sophie Bernard',          'Data Engineer',               'FR · Data Engineering'],
  ['Nicolas Dubois',          'DevOps Engineer',             'FR · DevOps & SRE'],
  ['Émilie Thomas',           'ML Engineer',                 'FR · Machine Learning'],
  ['François Robert',         'Security Engineer',           'FR · Security Engineering'],
  ['Camille Richard',         'Frontend Engineer',           'FR · Frontend Engineering'],
  ['Théo Petit',              'Platform Engineer',           'FR · Platform Engineering'],
  ['Charlotte Durand',        'Site Reliability Engineer',   'FR · DevOps & SRE'],
  ['Maxime Leroy',            'Cloud Architect',             'FR · Cloud Architecture'],
  ['Lucie Moreau',            'Data Scientist',              'FR · Data Science'],
  ['Antoine Simon',           'Software Engineer',           'FR · Software Engineering'],
  ['Pauline Laurent',         'QA Engineer',                 'FR · Quality Engineering'],
  ['Baptiste Lefebvre',       'Systems Engineer',            'FR · Systems Engineering'],
  ['Léa Roux',                'Staff Software Engineer',     'FR · Software Engineering'],
  ['Julien Fournier',         'Tech Lead',                   'FR · Engineering Leadership'],
  // ── United Kingdom (91–110) ───────────────────────────────────────────────
  ['James Smith',             'Principal Software Engineer', 'GB · Architecture'],
  ['Emma Jones',              'Data Engineer',               'GB · Data Engineering'],
  ['Oliver Williams',         'DevOps Engineer',             'GB · DevOps & SRE'],
  ['Sophie Brown',            'ML Engineer',                 'GB · Machine Learning'],
  ['Harry Taylor',            'Backend Engineer',            'GB · Backend Engineering'],
  ['Isabella Davies',         'Frontend Engineer',           'GB · Frontend Engineering'],
  ['Jack Evans',              'Security Engineer',           'GB · Security Engineering'],
  ['Alice Wilson',            'QA Engineer',                 'GB · Quality Engineering'],
  ['George Roberts',          'Cloud Architect',             'GB · Cloud Architecture'],
  ['Emily Johnson',           'Systems Engineer',            'GB · Systems Engineering'],
  ['Charlie Wood',            'Platform Engineer',           'GB · Platform Engineering'],
  ['Lily Thompson',           'Solutions Architect',         'GB · Solutions Architecture'],
  ['William White',           'Site Reliability Engineer',   'GB · DevOps & SRE'],
  ['Grace Wright',            'AI Engineer',                 'GB · AI Research'],
  ['Thomas Martin',           'Embedded Systems Engineer',   'GB · Embedded Systems'],
  ['Poppy Green',             'Full Stack Engineer',         'GB · Full Stack Engineering'],
  ['Edward Hall',             'Data Scientist',              'GB · Data Science'],
  ['Ava Collins',             'Software Engineer',           'GB · Software Engineering'],
  ['Henry Clarke',            'Engineering Manager',         'GB · Engineering Leadership'],
  ['Mia Edwards',             'Tech Lead',                   'GB · Engineering Leadership'],
  // ── United States (111–130) ───────────────────────────────────────────────
  ['Michael Johnson',         'Senior Software Engineer',    'US · Software Engineering'],
  ['Jennifer Williams',       'DevOps Engineer',             'US · DevOps & SRE'],
  ['Jason Brown',             'Backend Engineer',            'US · Backend Engineering'],
  ['Ashley Jones',            'ML Engineer',                 'US · Machine Learning'],
  ['Kevin Garcia',            'Platform Engineer',           'US · Platform Engineering'],
  ['Jessica Miller',          'Data Scientist',              'US · Data Science'],
  ['Brian Davis',             'Security Engineer',           'US · Security Engineering'],
  ['Sarah Martinez',          'Frontend Engineer',           'US · Frontend Engineering'],
  ['Ryan Anderson',           'Cloud Architect',             'US · Cloud Architecture'],
  ['Megan Wilson',            'QA Engineer',                 'US · Quality Engineering'],
  ['Scott Thompson',          'Site Reliability Engineer',   'US · DevOps & SRE'],
  ['Lauren Taylor',           'Full Stack Engineer',         'US · Full Stack Engineering'],
  ['Eric Moore',              'Systems Engineer',            'US · Systems Engineering'],
  ['Stephanie Lee',           'Data Engineer',               'US · Data Engineering'],
  ['Brandon Jackson',         'Principal Architect',         'US · Architecture'],
  ['Rachel Harris',           'AI Engineer',                 'US · AI Research'],
  ['Tyler Martin',            'Software Engineer',           'US · Software Engineering'],
  ['Nicole Clark',            'Engineering Manager',         'US · Engineering Leadership'],
  ['Derek Lewis',             'SDET',                        'US · Quality Engineering'],
  ['Amanda Robinson',         'Staff Software Engineer',     'US · Software Engineering'],
  // ── India (131–150) ───────────────────────────────────────────────────────
  ['Arjun Sharma',            'Senior Software Engineer',    'IN · Software Engineering'],
  ['Priya Patel',             'Data Engineer',               'IN · Data Engineering'],
  ['Rahul Singh',             'Backend Engineer',            'IN · Backend Engineering'],
  ['Ananya Kumar',            'ML Engineer',                 'IN · Machine Learning'],
  ['Vikram Gupta',            'DevOps Engineer',             'IN · DevOps & SRE'],
  ['Divya Verma',             'Frontend Engineer',           'IN · Frontend Engineering'],
  ['Amit Joshi',              'Platform Engineer',           'IN · Platform Engineering'],
  ['Neha Mehta',              'QA Engineer',                 'IN · Quality Engineering'],
  ['Sanjay Nair',             'Cloud Architect',             'IN · Cloud Architecture'],
  ['Pooja Reddy',             'Data Scientist',              'IN · Data Science'],
  ['Rajesh Rao',              'Site Reliability Engineer',   'IN · DevOps & SRE'],
  ['Kavya Shah',              'Security Engineer',           'IN · Security Engineering'],
  ['Kiran Bhatia',            'Systems Engineer',            'IN · Systems Engineering'],
  ['Pradeep Malhotra',        'Staff Software Engineer',     'IN · Software Engineering'],
  ['Meera Chatterjee',        'Tech Lead',                   'IN · Engineering Leadership'],
  ['Suresh Mukherjee',        'Embedded Systems Engineer',   'IN · Embedded Systems'],
  ['Riya Iyer',               'AI Engineer',                 'IN · AI Research'],
  ['Vivek Krishnan',          'Engineering Manager',         'IN · Engineering Leadership'],
  ['Aditi Pillai',            'Software Engineer',           'IN · Software Engineering'],
  ['Rohan Agarwal',           'Full Stack Engineer',         'IN · Full Stack Engineering'],
  // ── Japan (151–165) ───────────────────────────────────────────────────────
  ['Kenji Tanaka',            'Software Engineer',           'JP · Software Engineering'],
  ['Yuki Yamamoto',           'Data Engineer',               'JP · Data Engineering'],
  ['Hiroshi Watanabe',        'Backend Engineer',            'JP · Backend Engineering'],
  ['Sakura Ito',              'ML Engineer',                 'JP · Machine Learning'],
  ['Takashi Suzuki',          'DevOps Engineer',             'JP · DevOps & SRE'],
  ['Hana Sato',               'Frontend Engineer',           'JP · Frontend Engineering'],
  ['Satoshi Nakamura',        'Security Engineer',           'JP · Security Engineering'],
  ['Aoi Kobayashi',           'QA Engineer',                 'JP · Quality Engineering'],
  ['Ryu Kato',                'Platform Engineer',           'JP · Platform Engineering'],
  ['Misaki Yoshida',          'Site Reliability Engineer',   'JP · DevOps & SRE'],
  ['Daiki Yamada',            'Cloud Architect',             'JP · Cloud Architecture'],
  ['Ayaka Sasaki',            'Systems Engineer',            'JP · Systems Engineering'],
  ['Haruto Matsumoto',        'Data Scientist',              'JP · Data Science'],
  ['Rina Inoue',              'Staff Software Engineer',     'JP · Software Engineering'],
  ['Sota Kimura',             'Tech Lead',                   'JP · Engineering Leadership'],
  // ── Brazil (166–180) ──────────────────────────────────────────────────────
  ['Lucas Silva',             'Backend Engineer',            'BR · Backend Engineering'],
  ['Ana Santos',              'Data Engineer',               'BR · Data Engineering'],
  ['Gabriel Oliveira',        'DevOps Engineer',             'BR · DevOps & SRE'],
  ['Beatriz Souza',           'ML Engineer',                 'BR · Machine Learning'],
  ['Matheus Lima',            'Frontend Engineer',           'BR · Frontend Engineering'],
  ['Camila Ferreira',         'QA Engineer',                 'BR · Quality Engineering'],
  ['Rodrigo Costa',           'Platform Engineer',           'BR · Platform Engineering'],
  ['Julia Rodrigues',         'Security Engineer',           'BR · Security Engineering'],
  ['Rafael Almeida',          'Cloud Architect',             'BR · Cloud Architecture'],
  ['Fernanda Nascimento',     'Data Scientist',              'BR · Data Science'],
  ['Felipe Carvalho',         'Systems Engineer',            'BR · Systems Engineering'],
  ['Isabella Ribeiro',        'Site Reliability Engineer',   'BR · DevOps & SRE'],
  ['Carlos Azevedo',          'Software Engineer',           'BR · Software Engineering'],
  ['Mariana Gomes',           'Full Stack Engineer',         'BR · Full Stack Engineering'],
  ['André Monteiro',          'Tech Lead',                   'BR · Engineering Leadership'],
  // ── Spain (181–193) ───────────────────────────────────────────────────────
  ['Alejandro García',        'Senior Software Engineer',    'ES · Software Engineering'],
  ['Lucía Martínez',          'Data Engineer',               'ES · Data Engineering'],
  ['Carlos López',            'Backend Engineer',            'ES · Backend Engineering'],
  ['María Sánchez',           'ML Engineer',                 'ES · Machine Learning'],
  ['David González',          'DevOps Engineer',             'ES · DevOps & SRE'],
  ['Sara Pérez',              'Frontend Engineer',           'ES · Frontend Engineering'],
  ['Diego Rodríguez',         'Platform Engineer',           'ES · Platform Engineering'],
  ['Paula Fernández',         'QA Engineer',                 'ES · Quality Engineering'],
  ['Miguel Torres',           'Cloud Architect',             'ES · Cloud Architecture'],
  ['Elena Ramírez',           'Security Engineer',           'ES · Security Engineering'],
  ['Javier Díaz',             'Systems Engineer',            'ES · Systems Engineering'],
  ['Sofía Castillo',          'Data Scientist',              'ES · Data Science'],
  ['Roberto Moreno',          'Tech Lead',                   'ES · Engineering Leadership'],
  // ── Italy (194–205) ───────────────────────────────────────────────────────
  ['Marco Rossi',             'Senior Software Engineer',    'IT · Software Engineering'],
  ['Giulia Ferrari',          'Data Engineer',               'IT · Data Engineering'],
  ['Luca Esposito',           'Backend Engineer',            'IT · Backend Engineering'],
  ['Valentina Bianchi',       'ML Engineer',                 'IT · Machine Learning'],
  ['Giovanni Romano',         'DevOps Engineer',             'IT · DevOps & SRE'],
  ['Chiara Colombo',          'Frontend Engineer',           'IT · Frontend Engineering'],
  ['Alessandro Ricci',        'Platform Engineer',           'IT · Platform Engineering'],
  ['Francesca Marino',        'QA Engineer',                 'IT · Quality Engineering'],
  ['Francesco Greco',         'Cloud Architect',             'IT · Cloud Architecture'],
  ['Sara Bruno',              'Security Engineer',           'IT · Security Engineering'],
  ['Matteo Conti',            'Systems Engineer',            'IT · Systems Engineering'],
  ['Martina Serra',           'Tech Lead',                   'IT · Engineering Leadership'],
  // ── Netherlands (206–213) ─────────────────────────────────────────────────
  ['Jan de Vries',            'Senior Software Engineer',    'NL · Software Engineering'],
  ['Emma van den Berg',       'Data Engineer',               'NL · Data Engineering'],
  ['Pieter van Dijk',         'Backend Engineer',            'NL · Backend Engineering'],
  ['Lieke Bakker',            'ML Engineer',                 'NL · Machine Learning'],
  ['Sjoerd Janssen',          'DevOps Engineer',             'NL · DevOps & SRE'],
  ['Anouk Visser',            'Frontend Engineer',           'NL · Frontend Engineering'],
  ['Thijs Smit',              'Platform Engineer',           'NL · Platform Engineering'],
  ['Noor Meijer',             'QA Engineer',                 'NL · Quality Engineering'],
  // ── Canada (214–220) ──────────────────────────────────────────────────────
  ['Andrew MacDonald',        'Senior Software Engineer',    'CA · Software Engineering'],
  ['Emily Murphy',            'Data Scientist',              'CA · Data Science'],
  ['Patrick MacLean',         'DevOps Engineer',             'CA · DevOps & SRE'],
  ['Madison Campbell',        'ML Engineer',                 'CA · Machine Learning'],
  ['Sean Stewart',            'Backend Engineer',            'CA · Backend Engineering'],
  ['Abigail Clarke',          'Frontend Engineer',           'CA · Frontend Engineering'],
  ['Connor Ross',             'Security Engineer',           'CA · Security Engineering'],
  // ── Australia (221–227) ───────────────────────────────────────────────────
  ['Lachlan Smith',           'Senior Software Engineer',    'AU · Software Engineering'],
  ['Chloe Jones',             'Data Engineer',               'AU · Data Engineering'],
  ['Cameron Williams',        'Backend Engineer',            'AU · Backend Engineering'],
  ['Isla Brown',              'ML Engineer',                 'AU · Machine Learning'],
  ['Dylan Taylor',            'DevOps Engineer',             'AU · DevOps & SRE'],
  ['Sienna Wilson',           'Frontend Engineer',           'AU · Frontend Engineering'],
  ['Angus Martin',            'Cloud Architect',             'AU · Cloud Architecture'],
]

export const USERS: User[] = RAW_USERS.map(([name, title, codes], i) => ({
  id: String(i + 1),
  name, title, codes,
  color: USER_COLORS[i % USER_COLORS.length],
  avatar: av((i % 70) + 1),
}))

// Top performers have 3 activities; next tier has 2; everyone else has 1.
// Points: Public Speaking=30, University Partnership=25, Education=20
const MULTI_ACTIVITY: Record<string, string[]> = {
  '1':   ['Public Speaking', 'Public Speaking', 'University Partnership'],  // 85 pts
  '56':  ['Public Speaking', 'Public Speaking', 'University Partnership'],  // 85 pts
  '91':  ['Public Speaking', 'Public Speaking', 'Education'],               // 80 pts
  '111': ['Public Speaking', 'University Partnership', 'Education'],        // 75 pts
  '131': ['Public Speaking', 'University Partnership', 'Education'],        // 75 pts
  '2':   ['Public Speaking', 'Education'],              // 50 pts
  '3':   ['Public Speaking', 'University Partnership'], // 55 pts
  '4':   ['University Partnership', 'Education'],       // 45 pts
  '5':   ['Public Speaking', 'Education'],              // 50 pts
  '26':  ['Public Speaking', 'University Partnership'], // 55 pts
  '27':  ['University Partnership', 'Education'],       // 45 pts
  '42':  ['Public Speaking', 'Education'],              // 50 pts
  '57':  ['Public Speaking', 'University Partnership'], // 55 pts
  '76':  ['University Partnership', 'Education'],       // 45 pts
  '92':  ['Public Speaking', 'Education'],              // 50 pts
  '112': ['Public Speaking', 'University Partnership'], // 55 pts
  '132': ['University Partnership', 'Education'],       // 45 pts
  '151': ['Public Speaking', 'Education'],              // 50 pts
  '152': ['Public Speaking', 'University Partnership'], // 55 pts
  '166': ['University Partnership', 'Education'],       // 45 pts
  '181': ['Public Speaking', 'Education'],              // 50 pts
  '194': ['Public Speaking', 'University Partnership'], // 55 pts
  '206': ['University Partnership', 'Education'],       // 45 pts
  '214': ['Public Speaking', 'Education'],              // 50 pts
  '221': ['Public Speaking', 'University Partnership'], // 55 pts
}

const SINGLE_CATS = ['Public Speaking', 'University Partnership', 'Education'] as const

const USER_CATEGORY_LISTS: Record<string, string[]> = Object.fromEntries(
  Array.from({ length: 227 }, (_, i) => {
    const id = String(i + 1)
    return [id, MULTI_ACTIVITY[id] ?? [SINGLE_CATS[i % 3]]]
  })
)

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

      // Pick a random day within the quarter
      const qMonthStart = (quarter - 1) * 3  // 0, 3, 6, 9
      const month = qMonthStart + Math.floor(rng() * 3)
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const day = Math.floor(rng() * daysInMonth) + 1
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      result.push({
        id: String(id++),
        userId: user.id,
        category,
        title: pool[titleIdx],
        points: POINTS[category],
        year,
        quarter,
        date,
      })
    }
  }

  return result
})()

export const AVAILABLE_YEARS = ['2025', '2024'] as const
