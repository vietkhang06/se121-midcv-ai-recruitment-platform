export interface TaxonomySkill {
  name: string;
  category: 'Backend' | 'Frontend' | 'Database' | 'DevOps' | 'Mobile' | 'Design' | 'Marketing' | 'Finance' | 'General';
  aliases?: string[];
}

export const SKILL_TAXONOMY: TaxonomySkill[] = [
  // Java Ecosystem
  { name: 'Java', category: 'Backend', aliases: ['java 17', 'java 21', 'core java'] },
  { name: 'Java Spring Boot', category: 'Backend', aliases: ['springboot', 'spring-boot', 'spring boot'] },
  { name: 'Java EE', category: 'Backend', aliases: ['jee', 'j2ee'] },
  { name: 'JavaFX', category: 'Backend', aliases: ['javafx'] },
  { name: 'Jakarta EE', category: 'Backend', aliases: ['jakarta'] },

  // Spring Ecosystem
  { name: 'Spring', category: 'Backend', aliases: ['spring framework'] },
  { name: 'Spring Boot', category: 'Backend', aliases: ['springboot', 'spring-boot'] },
  { name: 'Spring Security', category: 'Backend', aliases: ['spring-security'] },
  { name: 'Spring Data', category: 'Backend', aliases: ['spring-data', 'spring data jpa'] },
  { name: 'Spring Cloud', category: 'Backend', aliases: ['spring-cloud', 'spring microservices'] },

  // Container & Cloud Ecosystem
  { name: 'Docker', category: 'DevOps', aliases: ['containerization', 'docker engine'] },
  { name: 'Docker Compose', category: 'DevOps', aliases: ['docker-compose'] },
  { name: 'Docker Swarm', category: 'DevOps', aliases: ['swarm'] },
  { name: 'Kubernetes', category: 'DevOps', aliases: ['k8s', 'kube'] },
  { name: 'Amazon Web Services (AWS)', category: 'DevOps', aliases: ['aws', 'amazon web services'] },
  { name: 'Google Cloud Platform (GCP)', category: 'DevOps', aliases: ['gcp', 'google cloud'] },
  { name: 'Microsoft Azure', category: 'DevOps', aliases: ['azure'] },

  // Frontend Ecosystem
  { name: 'JavaScript', category: 'Frontend', aliases: ['js', 'es6', 'ecmascript'] },
  { name: 'TypeScript', category: 'Frontend', aliases: ['ts'] },
  { name: 'React', category: 'Frontend', aliases: ['reactjs', 'react.js'] },
  { name: 'Next.js', category: 'Frontend', aliases: ['nextjs', 'next'] },
  { name: 'Vue.js', category: 'Frontend', aliases: ['vue', 'vuejs'] },
  { name: 'Angular', category: 'Frontend', aliases: ['angularjs', 'angular 2+'] },
  { name: 'TailwindCSS', category: 'Frontend', aliases: ['tailwind'] },

  // Database Ecosystem
  { name: 'PostgreSQL', category: 'Database', aliases: ['postgres', 'pgsql'] },
  { name: 'MySQL', category: 'Database', aliases: ['my-sql'] },
  { name: 'MongoDB', category: 'Database', aliases: ['mongo'] },
  { name: 'Redis', category: 'Database', aliases: ['in-memory cache'] },
  { name: 'Pgvector', category: 'Database', aliases: ['vector database'] },

  // Marketing Ecosystem
  { name: 'Google Analytics 4', category: 'Marketing', aliases: ['ga4', 'google analytics'] },
  { name: 'Facebook Ads', category: 'Marketing', aliases: ['fb ads', 'meta ads'] },
  { name: 'SEO', category: 'Marketing', aliases: ['search engine optimization'] },
  { name: 'Content Marketing', category: 'Marketing', aliases: ['copywriting'] },

  // Design Ecosystem
  { name: 'Figma', category: 'Design', aliases: ['figma ui', 'figma design'] },
  { name: 'Adobe XD', category: 'Design', aliases: ['adobe-xd'] },
  { name: 'Wireframing', category: 'Design', aliases: ['wireframe', 'lo-fi wireframes'] },
  { name: 'UI Prototyping', category: 'Design', aliases: ['prototyping', 'interactive prototype'] },

  // Finance Ecosystem
  { name: 'Financial Reporting', category: 'Finance', aliases: ['financial reports', 'gaap'] },
  { name: 'Tax Compliance', category: 'Finance', aliases: ['tax', 'corporate tax'] },
  { name: 'Excel', category: 'Finance', aliases: ['ms excel', 'advanced excel'] },
  { name: 'SAP', category: 'Finance', aliases: ['sap erp'] }
];

export const CANONICAL_ALIAS_LOOKUP: Record<string, string> = {
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'react.js': 'React',
  'reactjs': 'React',
  'react': 'React',
  'k8s': 'Kubernetes',
  'kubernetes': 'Kubernetes',
  'spring framework': 'Spring Boot',
  'springboot': 'Spring Boot',
  'spring-boot': 'Spring Boot',
  'docker': 'Docker',
  'docker compose': 'Docker Compose',
  'docker-compose': 'Docker Compose',
  'docker swarm': 'Docker Swarm',
  'ga4': 'Google Analytics 4',
  'google analytics': 'Google Analytics 4',
  'aws': 'Amazon Web Services (AWS)'
};
