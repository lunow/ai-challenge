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

// [name, title, codes]
const RAW_USERS: [string, string, string][] = [
  // ── Poland (1–25) ─────────────────────────────────────────────────────────
  ['Piotr Kowalski',          'Senior Software Engineer',    'PL.U1.D1.G1'],
  ['Agnieszka Wiśniewska',    'DevOps Engineer',             'PL.U1.D1.G2'],
  ['Krzysztof Nowak',         'Data Engineer',               'PL.U1.D2.G1'],
  ['Magdalena Szymańska',     'ML Engineer',                 'PL.U1.D2.G2'],
  ['Michał Wójcik',           'Tech Lead',                   'PL.U1.D3.G1'],
  ['Anna Kowalczyk',          'Backend Engineer',            'PL.U2.D1.G1'],
  ['Tomasz Kamiński',         'Frontend Engineer',           'PL.U2.D1.G2'],
  ['Ewelina Lewandowska',     'QA Engineer',                 'PL.U2.D2.G1'],
  ['Rafał Zieliński',         'Full Stack Engineer',         'PL.U2.D2.G2'],
  ['Natalia Mazur',           'Cloud Architect',             'PL.U2.D3.G1'],
  ['Bartosz Krawczyk',        'Security Engineer',           'PL.U3.D1.G1'],
  ['Marta Piotrowska',        'Site Reliability Engineer',   'PL.U3.D1.G2'],
  ['Kamil Grabowski',         'Platform Engineer',           'PL.U3.D2.G1'],
  ['Dominika Jankowska',      'Principal Software Engineer', 'PL.U3.D2.G2'],
  ['Szymon Wojciechowski',    'Engineering Manager',         'PL.U3.D3.G1'],
  ['Justyna Kwiatkowska',     'Data Scientist',              'PL.U4.D1.G1'],
  ['Łukasz Kaczmarek',        'Infrastructure Engineer',     'PL.U4.D1.G2'],
  ['Weronika Woźniak',        'Staff Software Engineer',     'PL.U4.D2.G1'],
  ['Paweł Kozłowski',         'Embedded Systems Engineer',   'PL.U4.D2.G2'],
  ['Filip Majewski',          'Systems Engineer',            'PL.U4.D3.G1'],
  ['Monika Nowakowska',       'Senior QA Engineer',          'PL.U1.G1'],
  ['Grzegorz Jaworski',       'SDET',                        'PL.U1.G2'],
  ['Patrycja Chmielewska',    'Solutions Architect',         'PL.U2.G1'],
  ['Artur Wiśniewski',        'Lead Software Engineer',      'PL.U2.G2'],
  ['Zuzanna Dąbrowska',       'Senior Backend Engineer',     'PL.U3.G1'],
  // ── Uzbekistan (26–40) ────────────────────────────────────────────────────
  ['Sardor Yusupov',          'Backend Engineer',            'UZ.U1.D1.G1'],
  ['Malika Rahimova',         'Lead QA Engineer',            'UZ.U1.D1.G2'],
  ['Jasur Karimov',           'DevOps Engineer',             'UZ.U1.D2.G1'],
  ['Zulfiya Ergasheva',       'QA Engineer',                 'UZ.U1.D2.G2'],
  ['Nodir Xasanov',           'Data Engineer',               'UZ.U2.D1.G1'],
  ['Nodira Toshmatova',       'Frontend Engineer',           'UZ.U2.D1.G2'],
  ['Bobur Nazarov',           'ML Engineer',                 'UZ.U2.D2.G1'],
  ['Gulnora Ismoilova',       'Software Engineer',           'UZ.U2.D2.G2'],
  ['Timur Mirzayev',          'Platform Engineer',           'UZ.U3.D1.G1'],
  ['Shahnoza Qodirova',       'Systems Engineer',            'UZ.U3.D1.G2'],
  ['Aziz Pulatov',            'Senior Software Engineer',    'UZ.U3.D2.G1'],
  ['Ozoda Razzaqova',         'Data Scientist',              'UZ.U3.D2.G2'],
  ['Eldor Sobirov',           'Infrastructure Engineer',     'UZ.U1.G1'],
  ['Feruza Haydarova',        'Security Engineer',           'UZ.U1.G2'],
  ['Sanjar Abdullayev',       'Tech Lead',                   'UZ.U2.G1'],
  // ── Kyrgyzstan (41–55) ────────────────────────────────────────────────────
  ['Aibek Mamytbekov',        'Frontend Developer',          'KG.U1.D1.G1'],
  ['Ainura Osmonova',         'DevOps Engineer',             'KG.U1.D1.G2'],
  ['Bakyt Toktorov',          'Tech Lead',                   'KG.U1.D2.G1'],
  ['Nurlan Sydykov',          'Senior Software Engineer',    'KG.U1.D2.G2'],
  ['Gulmira Abakirova',       'QA Engineer',                 'KG.U2.D1.G1'],
  ['Ermek Kojobekov',         'Backend Engineer',            'KG.U2.D1.G2'],
  ['Jyldyz Jumaeva',          'Data Engineer',               'KG.U2.D2.G1'],
  ['Manas Rysbekov',          'Platform Engineer',           'KG.U2.D2.G2'],
  ['Aizat Bekturova',         'ML Engineer',                 'KG.U3.D1.G1'],
  ['Azamat Dzhaksybekov',     'Infrastructure Engineer',     'KG.U3.D1.G2'],
  ['Bermet Osmonbekova',      'Software Engineer',           'KG.U3.D2.G1'],
  ['Kuban Jumabaev',          'Security Engineer',           'KG.U3.D2.G2'],
  ['Zuura Abdykadyrova',      'Solutions Architect',         'KG.U1.G1'],
  ['Mirlan Sultanbekov',      'Staff Software Engineer',     'KG.U1.G2'],
  ['Daniyar Seitkali',        'Engineering Manager',         'KG.U2.G1'],
  // ── Germany (56–75) ───────────────────────────────────────────────────────
  ['Thomas Müller',           'Principal Software Engineer', 'DE.U1.D1.G1'],
  ['Julia Schmidt',           'Senior DevOps Engineer',      'DE.U1.D1.G2'],
  ['Lukas Schneider',         'Platform Engineer',           'DE.U1.D2.G1'],
  ['Katharina Fischer',       'Data Scientist',              'DE.U1.D2.G2'],
  ['Michael Weber',           'Cloud Architect',             'DE.U1.D3.G1'],
  ['Sarah Meyer',             'AI Engineer',                 'DE.U2.D1.G1'],
  ['Andreas Wagner',          'Security Engineer',           'DE.U2.D1.G2'],
  ['Lena Becker',             'Backend Engineer',            'DE.U2.D2.G1'],
  ['Klaus Schulz',            'Embedded Systems Engineer',   'DE.U2.D2.G2'],
  ['Sophie Hoffmann',         'Frontend Engineer',           'DE.U2.D3.G1'],
  ['Stefan Schäfer',          'Site Reliability Engineer',   'DE.U3.D1.G1'],
  ['Marie Koch',              'Full Stack Engineer',         'DE.U3.D1.G2'],
  ['Markus Bauer',            'Systems Engineer',            'DE.U3.D2.G1'],
  ['Hannah Richter',          'QA Engineer',                 'DE.U3.D2.G2'],
  ['Christian Klein',         'Data Engineer',               'DE.U3.D3.G1'],
  ['Anna Wolf',               'ML Engineer',                 'DE.U4.D1.G1'],
  ['Daniel Schröder',         'Solutions Architect',         'DE.U4.D1.G2'],
  ['Emma Neumann',            'Tech Lead',                   'DE.U4.D2.G1'],
  ['Florian Schwarz',         'Engineering Manager',         'DE.U4.D2.G2'],
  ['Leonie Zimmermann',       'Senior Software Engineer',    'DE.U4.D3.G1'],
  // ── France (76–90) ────────────────────────────────────────────────────────
  ['Pierre Martin',           'Backend Engineer',            'FR.U1.D1.G1'],
  ['Sophie Bernard',          'Data Engineer',               'FR.U1.D1.G2'],
  ['Nicolas Dubois',          'DevOps Engineer',             'FR.U1.D2.G1'],
  ['Émilie Thomas',           'ML Engineer',                 'FR.U1.D2.G2'],
  ['François Robert',         'Security Engineer',           'FR.U2.D1.G1'],
  ['Camille Richard',         'Frontend Engineer',           'FR.U2.D1.G2'],
  ['Théo Petit',              'Platform Engineer',           'FR.U2.D2.G1'],
  ['Charlotte Durand',        'Site Reliability Engineer',   'FR.U2.D2.G2'],
  ['Maxime Leroy',            'Cloud Architect',             'FR.U3.D1.G1'],
  ['Lucie Moreau',            'Data Scientist',              'FR.U3.D1.G2'],
  ['Antoine Simon',           'Software Engineer',           'FR.U3.D2.G1'],
  ['Pauline Laurent',         'QA Engineer',                 'FR.U1.G1'],
  ['Baptiste Lefebvre',       'Systems Engineer',            'FR.U1.G2'],
  ['Léa Roux',                'Staff Software Engineer',     'FR.U2.G1'],
  ['Julien Fournier',         'Tech Lead',                   'FR.U2.G2'],
  // ── United Kingdom (91–110) ───────────────────────────────────────────────
  ['James Smith',             'Principal Software Engineer', 'GB.U1.D1.G1'],
  ['Emma Jones',              'Data Engineer',               'GB.U1.D1.G2'],
  ['Oliver Williams',         'DevOps Engineer',             'GB.U1.D2.G1'],
  ['Sophie Brown',            'ML Engineer',                 'GB.U1.D2.G2'],
  ['Harry Taylor',            'Backend Engineer',            'GB.U1.D3.G1'],
  ['Isabella Davies',         'Frontend Engineer',           'GB.U2.D1.G1'],
  ['Jack Evans',              'Security Engineer',           'GB.U2.D1.G2'],
  ['Alice Wilson',            'QA Engineer',                 'GB.U2.D2.G1'],
  ['George Roberts',          'Cloud Architect',             'GB.U2.D2.G2'],
  ['Emily Johnson',           'Systems Engineer',            'GB.U2.D3.G1'],
  ['Charlie Wood',            'Platform Engineer',           'GB.U3.D1.G1'],
  ['Lily Thompson',           'Solutions Architect',         'GB.U3.D1.G2'],
  ['William White',           'Site Reliability Engineer',   'GB.U3.D2.G1'],
  ['Grace Wright',            'AI Engineer',                 'GB.U3.D2.G2'],
  ['Thomas Martin',           'Embedded Systems Engineer',   'GB.U3.D3.G1'],
  ['Poppy Green',             'Full Stack Engineer',         'GB.U4.D1.G1'],
  ['Edward Hall',             'Data Scientist',              'GB.U4.D1.G2'],
  ['Ava Collins',             'Software Engineer',           'GB.U4.D2.G1'],
  ['Henry Clarke',            'Engineering Manager',         'GB.U4.D2.G2'],
  ['Mia Edwards',             'Tech Lead',                   'GB.U4.D3.G1'],
  // ── United States (111–130) ───────────────────────────────────────────────
  ['Michael Johnson',         'Senior Software Engineer',    'US.U1.D1.G1'],
  ['Jennifer Williams',       'DevOps Engineer',             'US.U1.D1.G2'],
  ['Jason Brown',             'Backend Engineer',            'US.U1.D2.G1'],
  ['Ashley Jones',            'ML Engineer',                 'US.U1.D2.G2'],
  ['Kevin Garcia',            'Platform Engineer',           'US.U1.D3.G1'],
  ['Jessica Miller',          'Data Scientist',              'US.U2.D1.G1'],
  ['Brian Davis',             'Security Engineer',           'US.U2.D1.G2'],
  ['Sarah Martinez',          'Frontend Engineer',           'US.U2.D2.G1'],
  ['Ryan Anderson',           'Cloud Architect',             'US.U2.D2.G2'],
  ['Megan Wilson',            'QA Engineer',                 'US.U2.D3.G1'],
  ['Scott Thompson',          'Site Reliability Engineer',   'US.U3.D1.G1'],
  ['Lauren Taylor',           'Full Stack Engineer',         'US.U3.D1.G2'],
  ['Eric Moore',              'Systems Engineer',            'US.U3.D2.G1'],
  ['Stephanie Lee',           'Data Engineer',               'US.U3.D2.G2'],
  ['Brandon Jackson',         'Principal Architect',         'US.U3.D3.G1'],
  ['Rachel Harris',           'AI Engineer',                 'US.U4.D1.G1'],
  ['Tyler Martin',            'Software Engineer',           'US.U4.D1.G2'],
  ['Nicole Clark',            'Engineering Manager',         'US.U4.D2.G1'],
  ['Derek Lewis',             'SDET',                        'US.U4.D2.G2'],
  ['Amanda Robinson',         'Staff Software Engineer',     'US.U4.D3.G1'],
  // ── India (131–150) ───────────────────────────────────────────────────────
  ['Arjun Sharma',            'Senior Software Engineer',    'IN.U1.D1.G1'],
  ['Priya Patel',             'Data Engineer',               'IN.U1.D1.G2'],
  ['Rahul Singh',             'Backend Engineer',            'IN.U1.D2.G1'],
  ['Ananya Kumar',            'ML Engineer',                 'IN.U1.D2.G2'],
  ['Vikram Gupta',            'DevOps Engineer',             'IN.U1.D3.G1'],
  ['Divya Verma',             'Frontend Engineer',           'IN.U2.D1.G1'],
  ['Amit Joshi',              'Platform Engineer',           'IN.U2.D1.G2'],
  ['Neha Mehta',              'QA Engineer',                 'IN.U2.D2.G1'],
  ['Sanjay Nair',             'Cloud Architect',             'IN.U2.D2.G2'],
  ['Pooja Reddy',             'Data Scientist',              'IN.U2.D3.G1'],
  ['Rajesh Rao',              'Site Reliability Engineer',   'IN.U3.D1.G1'],
  ['Kavya Shah',              'Security Engineer',           'IN.U3.D1.G2'],
  ['Kiran Bhatia',            'Systems Engineer',            'IN.U3.D2.G1'],
  ['Pradeep Malhotra',        'Staff Software Engineer',     'IN.U3.D2.G2'],
  ['Meera Chatterjee',        'Tech Lead',                   'IN.U3.D3.G1'],
  ['Suresh Mukherjee',        'Embedded Systems Engineer',   'IN.U4.D1.G1'],
  ['Riya Iyer',               'AI Engineer',                 'IN.U4.D1.G2'],
  ['Vivek Krishnan',          'Engineering Manager',         'IN.U4.D2.G1'],
  ['Aditi Pillai',            'Software Engineer',           'IN.U4.D2.G2'],
  ['Rohan Agarwal',           'Full Stack Engineer',         'IN.U4.D3.G1'],
  // ── Japan (151–165) ───────────────────────────────────────────────────────
  ['Kenji Tanaka',            'Software Engineer',           'JP.U1.D1.G1'],
  ['Yuki Yamamoto',           'Data Engineer',               'JP.U1.D1.G2'],
  ['Hiroshi Watanabe',        'Backend Engineer',            'JP.U1.D2.G1'],
  ['Sakura Ito',              'ML Engineer',                 'JP.U1.D2.G2'],
  ['Takashi Suzuki',          'DevOps Engineer',             'JP.U2.D1.G1'],
  ['Hana Sato',               'Frontend Engineer',           'JP.U2.D1.G2'],
  ['Satoshi Nakamura',        'Security Engineer',           'JP.U2.D2.G1'],
  ['Aoi Kobayashi',           'QA Engineer',                 'JP.U2.D2.G2'],
  ['Ryu Kato',                'Platform Engineer',           'JP.U3.D1.G1'],
  ['Misaki Yoshida',          'Site Reliability Engineer',   'JP.U3.D1.G2'],
  ['Daiki Yamada',            'Cloud Architect',             'JP.U3.D2.G1'],
  ['Ayaka Sasaki',            'Systems Engineer',            'JP.U3.D2.G2'],
  ['Haruto Matsumoto',        'Data Scientist',              'JP.U1.G1'],
  ['Rina Inoue',              'Staff Software Engineer',     'JP.U1.G2'],
  ['Sota Kimura',             'Tech Lead',                   'JP.U2.G1'],
  // ── Brazil (166–180) ──────────────────────────────────────────────────────
  ['Lucas Silva',             'Backend Engineer',            'BR.U1.D1.G1'],
  ['Ana Santos',              'Data Engineer',               'BR.U1.D1.G2'],
  ['Gabriel Oliveira',        'DevOps Engineer',             'BR.U1.D2.G1'],
  ['Beatriz Souza',           'ML Engineer',                 'BR.U1.D2.G2'],
  ['Matheus Lima',            'Frontend Engineer',           'BR.U2.D1.G1'],
  ['Camila Ferreira',         'QA Engineer',                 'BR.U2.D1.G2'],
  ['Rodrigo Costa',           'Platform Engineer',           'BR.U2.D2.G1'],
  ['Julia Rodrigues',         'Security Engineer',           'BR.U2.D2.G2'],
  ['Rafael Almeida',          'Cloud Architect',             'BR.U3.D1.G1'],
  ['Fernanda Nascimento',     'Data Scientist',              'BR.U3.D1.G2'],
  ['Felipe Carvalho',         'Systems Engineer',            'BR.U3.D2.G1'],
  ['Isabella Ribeiro',        'Site Reliability Engineer',   'BR.U3.D2.G2'],
  ['Carlos Azevedo',          'Software Engineer',           'BR.U1.G1'],
  ['Mariana Gomes',           'Full Stack Engineer',         'BR.U1.G2'],
  ['André Monteiro',          'Tech Lead',                   'BR.U2.G1'],
  // ── Spain (181–193) ───────────────────────────────────────────────────────
  ['Alejandro García',        'Senior Software Engineer',    'ES.U1.D1.G1'],
  ['Lucía Martínez',          'Data Engineer',               'ES.U1.D1.G2'],
  ['Carlos López',            'Backend Engineer',            'ES.U1.D2.G1'],
  ['María Sánchez',           'ML Engineer',                 'ES.U1.D2.G2'],
  ['David González',          'DevOps Engineer',             'ES.U2.D1.G1'],
  ['Sara Pérez',              'Frontend Engineer',           'ES.U2.D1.G2'],
  ['Diego Rodríguez',         'Platform Engineer',           'ES.U2.D2.G1'],
  ['Paula Fernández',         'QA Engineer',                 'ES.U2.D2.G2'],
  ['Miguel Torres',           'Cloud Architect',             'ES.U3.D1.G1'],
  ['Elena Ramírez',           'Security Engineer',           'ES.U3.D1.G2'],
  ['Javier Díaz',             'Systems Engineer',            'ES.U1.G1'],
  ['Sofía Castillo',          'Data Scientist',              'ES.U1.G2'],
  ['Roberto Moreno',          'Tech Lead',                   'ES.U2.G1'],
  // ── Italy (194–205) ───────────────────────────────────────────────────────
  ['Marco Rossi',             'Senior Software Engineer',    'IT.U1.D1.G1'],
  ['Giulia Ferrari',          'Data Engineer',               'IT.U1.D1.G2'],
  ['Luca Esposito',           'Backend Engineer',            'IT.U1.D2.G1'],
  ['Valentina Bianchi',       'ML Engineer',                 'IT.U1.D2.G2'],
  ['Giovanni Romano',         'DevOps Engineer',             'IT.U2.D1.G1'],
  ['Chiara Colombo',          'Frontend Engineer',           'IT.U2.D1.G2'],
  ['Alessandro Ricci',        'Platform Engineer',           'IT.U2.D2.G1'],
  ['Francesca Marino',        'QA Engineer',                 'IT.U2.D2.G2'],
  ['Francesco Greco',         'Cloud Architect',             'IT.U3.D1.G1'],
  ['Sara Bruno',              'Security Engineer',           'IT.U3.D1.G2'],
  ['Matteo Conti',            'Systems Engineer',            'IT.U1.G1'],
  ['Martina Serra',           'Tech Lead',                   'IT.U1.G2'],
  // ── Netherlands (206–213) ─────────────────────────────────────────────────
  ['Jan de Vries',            'Senior Software Engineer',    'NL.U1.D1.G1'],
  ['Emma van den Berg',       'Data Engineer',               'NL.U1.D1.G2'],
  ['Pieter van Dijk',         'Backend Engineer',            'NL.U1.D2.G1'],
  ['Lieke Bakker',            'ML Engineer',                 'NL.U1.D2.G2'],
  ['Sjoerd Janssen',          'DevOps Engineer',             'NL.U2.D1.G1'],
  ['Anouk Visser',            'Frontend Engineer',           'NL.U2.D1.G2'],
  ['Thijs Smit',              'Platform Engineer',           'NL.U2.D2.G1'],
  ['Noor Meijer',             'QA Engineer',                 'NL.U2.D2.G2'],
  // ── Canada (214–220) ──────────────────────────────────────────────────────
  ['Andrew MacDonald',        'Senior Software Engineer',    'CA.U1.D1.G1'],
  ['Emily Murphy',            'Data Scientist',              'CA.U1.D1.G2'],
  ['Patrick MacLean',         'DevOps Engineer',             'CA.U1.D2.G1'],
  ['Madison Campbell',        'ML Engineer',                 'CA.U1.D2.G2'],
  ['Sean Stewart',            'Backend Engineer',            'CA.U2.D1.G1'],
  ['Abigail Clarke',          'Frontend Engineer',           'CA.U2.D1.G2'],
  ['Connor Ross',             'Security Engineer',           'CA.U2.D2.G1'],
  // ── Australia (221–227) ───────────────────────────────────────────────────
  ['Lachlan Smith',           'Senior Software Engineer',    'AU.U1.D1.G1'],
  ['Chloe Jones',             'Data Engineer',               'AU.U1.D1.G2'],
  ['Cameron Williams',        'Backend Engineer',            'AU.U1.D2.G1'],
  ['Isla Brown',              'ML Engineer',                 'AU.U1.D2.G2'],
  ['Dylan Taylor',            'DevOps Engineer',             'AU.U2.D1.G1'],
  ['Sienna Wilson',           'Frontend Engineer',           'AU.U2.D1.G2'],
  ['Angus Martin',            'Cloud Architect',             'AU.U2.D2.G1'],
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
