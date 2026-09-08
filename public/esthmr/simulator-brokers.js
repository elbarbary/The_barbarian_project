/* Broker tariffs and the statutory fee table, by hand.
 *
 * Split out of `simulator-data.js`, which also held a 1.6 MB company
 * directory. An ES module is fetched whole, so importing four kilobytes of
 * fee tables from that file cost every reader the directory too. The
 * directory is now a research input under `data-source/simulator/` and the
 * site reads it as split-per-company documents under `sim/`.
 */
/* ══════════════════════════════════════════════════════════════════════════════
 * ESTHMR Trading & App Fee Simulation Data
 * Imported historical series: provenance and corporate actions not yet audited.
 * Current-fee scenarios; non-Thndr brokerage tariffs remain unverified estimates.
 * ══════════════════════════════════════════════════════════════════════════════ */

/**
 * Current Thndr published regulatory schedule, before per-fill minima and caps.
 * Calculations live in simulator-engine.js. The EGP2 order ticket is brokerage,
 * not an additional MCDR clearing fee.
 */
export const STANDARD_STATUTORY_FEES = {
  regPctFmt: '0.055% T0 / 0.08% T1+',
  mcdrTicket: 0,
  items: [
    {id:'egx', nameEn:'EGX', nameAr:'البورصة', pct:'0.01% · max 5,000 EGP'},
    {id:'mcdr', nameEn:'MCDR', nameAr:'المقاصة', pct:'0.01% · max 5,000 EGP'},
    {id:'fra', nameEn:'FRA per fill', nameAr:'الرقابة لكل تنفيذ جزئي', pct:'0.005% · min 1 / max 250 EGP'},
    {id:'risk', nameEn:'Risk insurance', nameAr:'تأمين المخاطر', pct:'0.005% · max 5,000 EGP'},
    {id:'stamp', nameEn:'Stamp duty', nameAr:'الدمغة', pct:'0.025% T0 / 0.05% T1+'}
  ]
};

export const BROKER_PROFILES = [
  {
    id: 'beltone',
    nameEn: 'Beltone Financial',
    nameAr: 'بلتون لتداول الأوراق',
    typeEn: 'Digital & Institutional',
    typeAr: 'منصة رقمية ووساطة',
    brokerPct: 0.00125,
    brokerMin: 12.0,
    ticketFee: 0.0,
    monthlySub: 0.0,
    regPct: 0.00080,
    mcdrTicket: 0.0,
    badge: '0.125% (Min 12 EGP)',
    badgeAr: '0.125% (حد أدنى 12 ج)',
    taglineEn: '0.125% broker commission with 12 EGP minimum ticket charge',
    taglineAr: 'عمولة سمسرة 0.125% بحد أدنى 12 جنيهًا لكل عملية',
    color: '#2563EB',
    bgTint: 'rgba(37, 99, 235, 0.08)',
    borderTint: 'rgba(37, 99, 235, 0.3)'
  },
  {
    id: 'telda',
    nameEn: 'Telda Invest',
    nameAr: 'تيلدا لتداول الأوراق',
    typeEn: 'Digital App',
    typeAr: 'تطبيق رقمي',
    brokerPct: 0.0000,
    brokerMin: 0.0,
    ticketFee: 0.0,
    monthlySub: 0.0,
    regPct: 0.00080,
    mcdrTicket: 0.0,
    badge: 'Telda (0%)',
    badgeAr: 'تيلدا (0%)',
    taglineEn: '0% broker commission + standard statutory fees only',
    taglineAr: 'عمولة سمسرة 0% + الرسوم التنظيمية المقررة فقط',
    color: '#E11D48',
    bgTint: 'rgba(225, 29, 72, 0.08)',
    borderTint: 'rgba(225, 29, 72, 0.3)'
  },
  {
    id: 'thndr',
    nameEn: 'Thndr',
    nameAr: 'ثندر',
    typeEn: 'Digital App',
    typeAr: 'تطبيق وساطة رقمي',
    brokerPct: 0.0010,
    brokerMin: 0.0,
    ticketFee: 2.0,
    monthlySub: 245.0,
    regPct: 0.00080,
    mcdrTicket: 0.0,
    badge: '0.1% + 2 EGP per order',
    badgeAr: '0.1% + 2 ج لكل أمر',
    taglineEn: 'Trader: 245 EGP / 30 days; 50 eligible orders after commission refunds',
    taglineAr: 'تريدر: 245 ج / 30 يوماً، واسترداد عمولة 50 أمراً مؤهلاً',
    color: '#059669',
    bgTint: 'rgba(5, 150, 105, 0.08)',
    borderTint: 'rgba(5, 150, 105, 0.3)'
  },
  {
    id: 'mubasher',
    nameEn: 'MubasherTrade',
    nameAr: 'مباشر تداول',
    typeEn: 'Direct Trading',
    typeAr: 'منصة تداول مباشر',
    brokerPct: 0.00125,
    brokerMin: 10.0,
    ticketFee: 0.0,
    monthlySub: 0.0,
    regPct: 0.00080,
    mcdrTicket: 0.0,
    badge: '0.125% (Min 10 EGP)',
    badgeAr: '0.125% (حد أدنى 10 ج)',
    taglineEn: '0.125% commission with 10 EGP minimum ticket charge',
    taglineAr: 'عمولة سمسرة 0.125% بحد أدنى 10 جنيهات لكل عملية',
    color: '#D97706',
    bgTint: 'rgba(217, 119, 6, 0.08)',
    borderTint: 'rgba(217, 119, 6, 0.3)'
  },
  {
    id: 'hermes',
    nameEn: 'EFG Hermes ONE',
    nameAr: 'هيرميس إي إف جي',
    typeEn: 'Premier Investment Bank',
    typeAr: 'بنك استثمار ومؤسسات',
    brokerPct: 0.00150,
    brokerMin: 15.0,
    ticketFee: 0.0,
    monthlySub: 0.0,
    regPct: 0.00080,
    mcdrTicket: 0.0,
    badge: '0.150% (Min 15 EGP)',
    badgeAr: '0.150% (حد أدنى 15 ج)',
    taglineEn: '0.150% commission with 15 EGP minimum ticket charge',
    taglineAr: 'عمولة سمسرة 0.150% بحد أدنى 15 جنيهًا لكل عملية',
    color: '#7C3AED',
    bgTint: 'rgba(124, 58, 237, 0.08)',
    borderTint: 'rgba(124, 58, 237, 0.3)'
  },
  {
    id: 'cicapital',
    nameEn: 'CI Capital (CI Trade)',
    nameAr: 'سي آي كابيتال',
    typeEn: 'Full-Service Broker',
    typeAr: 'وساطة متكاملة وبنك استثمار',
    brokerPct: 0.00150,
    brokerMin: 15.0,
    ticketFee: 0.0,
    monthlySub: 0.0,
    regPct: 0.00080,
    mcdrTicket: 0.0,
    badge: '0.150% (Min 15 EGP)',
    badgeAr: '0.150% (حد أدنى 15 ج)',
    taglineEn: '0.150% commission with 15 EGP minimum ticket charge',
    taglineAr: 'عمولة سمسرة 0.150% بحد أدنى 15 جنيهًا لكل عملية',
    color: '#4F46E5',
    bgTint: 'rgba(79, 70, 229, 0.08)',
    borderTint: 'rgba(79, 70, 229, 0.3)'
  },
  {
    id: 'traditional',
    nameEn: 'Traditional Bank Broker',
    nameAr: 'السمسرة التقليدية / البنوك',
    typeEn: 'Branch / Bank Brokerage',
    typeAr: 'أفرع بنكية وسمسرة كلاسيكية',
    brokerPct: 0.00200,
    brokerMin: 25.0,
    ticketFee: 0.0,
    monthlySub: 0.0,
    regPct: 0.00080,
    mcdrTicket: 0.0,
    badge: '0.200% (Min 25 EGP)',
    badgeAr: '0.200% (حد أدنى 25 ج)',
    taglineEn: '0.200% commission with 25 EGP minimum ticket charge',
    taglineAr: 'عمولة سمسرة 0.200% بحد أدنى 25 جنيهًا لكل عملية منفذة',
    color: '#64748B',
    bgTint: 'rgba(100, 116, 139, 0.08)',
    borderTint: 'rgba(100, 116, 139, 0.3)'
  }
];
