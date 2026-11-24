import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { Application, Job, User } from '../models/index.js';

const PASSWORD = 'password123';

const employers = [
  { name: 'Amara Okafor', email: 'hiring@lumenpay.dev', company: { name: 'Lumen Pay', website: 'https://example.com', about: 'Payments infrastructure for African businesses.' } },
  { name: 'Jonas Weber', email: 'talent@northstack.dev', company: { name: 'NorthStack', website: 'https://example.com', about: 'Developer tooling for distributed teams.' } },
  { name: 'Priya Raman', email: 'jobs@brightlearn.dev', company: { name: 'BrightLearn', website: 'https://example.com', about: 'Online learning for the next billion learners.' } },
];

const candidates = [
  { name: 'Demo Candidate', email: 'candidate@remotehire.dev', headline: 'Frontend Engineer (React, Next.js)', skills: ['react', 'next.js', 'tailwind', 'redux'], location: 'Lagos, Nigeria', resumeUrl: 'https://example.com/resume.pdf' },
  { name: 'Tolu Adeyemi', email: 'tolu@remotehire.dev', headline: 'Full stack developer', skills: ['node.js', 'mongodb', 'react'], location: 'Abuja, Nigeria', resumeUrl: 'https://example.com/tolu.pdf' },
];

const jobTemplates = [
  ['Senior Frontend Engineer', 'senior', 'full-time', 'worldwide', 70000, 95000, ['react', 'next.js', 'typescript']],
  ['Mid-level React Developer', 'mid', 'full-time', 'africa', 35000, 55000, ['react', 'redux', 'tailwind']],
  ['Full Stack Engineer (Node + React)', 'mid', 'full-time', 'emea', 50000, 70000, ['node.js', 'react', 'mongodb']],
  ['Backend Engineer, Payments', 'senior', 'full-time', 'europe', 80000, 110000, ['node.js', 'postgres', 'payments']],
  ['Frontend Developer (Contract)', 'mid', 'contract', 'worldwide', 40000, 60000, ['vue', 'javascript', 'css']],
  ['Junior Web Developer', 'junior', 'full-time', 'africa', 15000, 25000, ['html', 'css', 'javascript']],
  ['Engineering Lead, Web Platform', 'lead', 'full-time', 'americas', 120000, 150000, ['react', 'leadership', 'architecture']],
  ['Next.js Developer', 'mid', 'part-time', 'worldwide', 25000, 40000, ['next.js', 'vercel', 'react']],
  ['Firebase / Supabase Engineer', 'mid', 'contract', 'worldwide', 45000, 65000, ['firebase', 'supabase', 'react']],
  ['Frontend Engineering Intern', 'junior', 'internship', 'africa', 6000, 9000, ['react', 'javascript']],
  ['Design Systems Engineer', 'senior', 'full-time', 'asia-pacific', 75000, 100000, ['react', 'storybook', 'css']],
  ['MERN Stack Developer', 'mid', 'full-time', 'worldwide', 45000, 65000, ['mongodb', 'express', 'react', 'node.js']],
];

const description = (title, company) => `${company} is hiring a ${title} to join our fully remote team.

You will work with product and design to ship features end to end, own the quality of what you build, and help shape our engineering culture.

What we offer:
- Fully remote, async-first team
- Flexible hours with a few hours of overlap
- Learning budget and modern hardware`;

async function seed() {
  await connectDB(env.mongoUri);
  await Promise.all([User.deleteMany({}), Job.deleteMany({}), Application.deleteMany({})]);

  const employerDocs = [];
  for (const e of employers) employerDocs.push(await User.create({ ...e, role: 'employer', password: PASSWORD }));
  const candidateDocs = [];
  for (const c of candidates) candidateDocs.push(await User.create({ ...c, role: 'candidate', password: PASSWORD }));

  const now = Date.now();
  const jobs = await Job.insertMany(
    jobTemplates.map(([title, level, type, region, salaryMin, salaryMax, tags], i) => {
      const employer = employerDocs[i % employerDocs.length];
      return {
        employer: employer._id,
        companyName: employer.company.name,
        title,
        level,
        type,
        region,
        salaryMin,
        salaryMax,
        tags,
        timezone: region === 'americas' ? 'UTC-8 to UTC-3' : region === 'worldwide' ? 'Any' : 'UTC-1 to UTC+3',
        description: description(title, employer.company.name),
        requirements: ['3+ years of professional experience', `Strong skills in ${tags.slice(0, 2).join(' and ')}`, 'Clear written communication'],
        createdAt: new Date(now - i * 26 * 60 * 60 * 1000),
      };
    })
  );

  const [demo, tolu] = candidateDocs;
  const applications = [
    { who: demo, job: jobs[0], status: 'submitted' },
    { who: demo, job: jobs[1], status: 'reviewing' },
    { who: demo, job: jobs[2], status: 'shortlisted' },
    { who: demo, job: jobs[7], status: 'submitted' },
    { who: tolu, job: jobs[0], status: 'shortlisted' },
    { who: tolu, job: jobs[3], status: 'reviewing' },
  ];
  for (const { who, job, status } of applications) {
    await Application.create({
      job: job._id,
      candidate: who._id,
      employer: job.employer,
      resumeUrl: who.resumeUrl,
      coverLetter: `Hi ${job.companyName} team, I have spent the last few years building React and Node.js products for remote teams, and I would love to bring that experience to this role.`,
      status,
    });
    await Job.updateOne({ _id: job._id }, { $inc: { applicationsCount: 1 } });
  }
  demo.savedJobs = [jobs[0]._id, jobs[11]._id];
  await demo.save();

  console.log(`Seeded ${employerDocs.length} employers, ${candidateDocs.length} candidates, ${jobs.length} jobs.`);
  console.log(`Log in with candidate@remotehire.dev or ${employers[0].email} (password: ${PASSWORD})`);
  await disconnectDB();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
