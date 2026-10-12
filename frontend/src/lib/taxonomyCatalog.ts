import { TaxonomyCatalogSkill, TaxonomyIndustry, TaxonomyJobFamily, SkillType } from '@/types';

// ============================================================
// 1. COMPREHENSIVE 27 INDUSTRY TAXONOMY FAMILIES (SECTION 5.2)
// ============================================================

export const TAXONOMY_INDUSTRIES: TaxonomyIndustry[] = [
  { id: 'IND_TECH', canonicalName: 'Software Engineering & IT', vi: 'Công nghệ thông tin & Phần mềm', en: 'Software Engineering & IT', active: true },
  { id: 'IND_DATA_AI', canonicalName: 'Data & Artificial Intelligence', vi: 'Dữ liệu & Trí tuệ nhân tạo (AI/ML)', en: 'Data & Artificial Intelligence', active: true },
  { id: 'IND_DEVOPS_CLOUD', canonicalName: 'Cloud Computing & DevOps', vi: 'Điện toán đám mây & DevOps', en: 'Cloud Computing & DevOps', active: true },
  { id: 'IND_SECURITY', canonicalName: 'Cybersecurity & IT Ops', vi: 'An toàn thông tin & Quản trị mạng', en: 'Cybersecurity & IT Operations', active: true },
  { id: 'IND_PRODUCT', canonicalName: 'Product & Project Management', vi: 'Quản lý sản phẩm & Dự án', en: 'Product & Project Management', active: true },
  { id: 'IND_DESIGN', canonicalName: 'UI/UX & Digital Design', vi: 'Thiết kế giao diện UI/UX & Đồ họa', en: 'UI/UX & Digital Design', active: true },
  { id: 'IND_MARKETING', canonicalName: 'Marketing & Communications', vi: 'Tiếp thị, Truyền thông & Quảng cáo', en: 'Marketing & Communications', active: true },
  { id: 'IND_SALES', canonicalName: 'Sales & Business Development', vi: 'Kinh doanh & Phát triển thị trường', en: 'Sales & Business Development', active: true },
  { id: 'IND_FINANCE', canonicalName: 'Finance, Banking & Fintech', vi: 'Tài chính, Ngân hàng & Fintech', en: 'Finance, Banking & Fintech', active: true },
  { id: 'IND_ACCOUNTING', canonicalName: 'Accounting & Audit', vi: 'Kế toán, Kiểm toán & Thuế', en: 'Accounting & Audit', active: true },
  { id: 'IND_HR', canonicalName: 'Human Resources & Talent', vi: 'Nhân sự & Tuyển dụng', en: 'Human Resources & Talent', active: true },
  { id: 'IND_BIZ_OPS', canonicalName: 'Business Operations & Consulting', vi: 'Vận hành doanh nghiệp & Tư vấn', en: 'Business Operations & Consulting', active: true },
  { id: 'IND_LOGISTICS', canonicalName: 'Supply Chain & Logistics', vi: 'Chuỗi cung ứng, Mua hàng & Vận tải', en: 'Supply Chain & Logistics', active: true },
  { id: 'IND_MANUFACTURING', canonicalName: 'Manufacturing & QA', vi: 'Sản xuất, Kỹ thuật công nghiệp & QA', en: 'Manufacturing & Quality Assurance', active: true },
  { id: 'IND_CONSTRUCTION', canonicalName: 'Civil Engineering & Architecture', vi: 'Xây dựng, Kiến trúc & Nội thất', en: 'Civil Engineering & Architecture', active: true },
  { id: 'IND_ELECTRONICS', canonicalName: 'Electrical & Automation', vi: 'Điện, Điện tử & Tự động hóa', en: 'Electrical, Electronics & Automation', active: true },
  { id: 'IND_HEALTHCARE', canonicalName: 'Healthcare & Life Sciences', vi: 'Y tế, Dược phẩm & Công nghệ sinh học', en: 'Healthcare & Life Sciences', active: true },
  { id: 'IND_EDUCATION', canonicalName: 'Education & Research', vi: 'Giáo dục, Đào tạo & Nghiên cứu', en: 'Education & Research', active: true },
  { id: 'IND_LEGAL', canonicalName: 'Legal & Compliance', vi: 'Pháp lý, Luật & Tuân thủ', en: 'Legal & Compliance', active: true },
  { id: 'IND_CUSTOMER_SERVICE', canonicalName: 'Customer Success & Support', vi: 'Chăm sóc khách hàng & Dịch vụ', en: 'Customer Success & Support', active: true },
  { id: 'IND_RETAIL', canonicalName: 'Retail & E-commerce', vi: 'Bán lẻ & Thương mại điện tử', en: 'Retail & E-commerce', active: true },
  { id: 'IND_HOSPITALITY', canonicalName: 'Hospitality & Tourism', vi: 'Du lịch, Khách sạn & Nhà hàng', en: 'Hospitality & Tourism', active: true },
  { id: 'IND_AGRICULTURE', canonicalName: 'Agriculture & Environment', vi: 'Nông nghiệp & Môi trường', en: 'Agriculture & Environment', active: true },
  { id: 'IND_ENERGY', canonicalName: 'Energy & Sustainability', vi: 'Năng lượng & Bền vững', en: 'Energy & Sustainability', active: true },
  { id: 'IND_MEDIA', canonicalName: 'Media & Entertainment', vi: 'Truyền thông đa phương tiện & Giải trí', en: 'Media & Entertainment', active: true },
  { id: 'IND_REAL_ESTATE', canonicalName: 'Real Estate & Property', vi: 'Bất động sản & Quản lý tài sản', en: 'Real Estate & Property Management', active: true },
  { id: 'IND_CROSS_DOMAIN', canonicalName: 'Cross-Domain Competencies', vi: 'Kỹ năng làm việc chuyên nghiệp dùng chung', en: 'Cross-Domain Competencies', active: true }
];

// ============================================================
// 2. JOB FAMILIES / ROLES
// ============================================================

export const TAXONOMY_JOB_FAMILIES: TaxonomyJobFamily[] = [
  { id: 'ROLE_BACKEND_DEV', canonicalName: 'Backend Engineer', vi: 'Kỹ sư phát triển Backend', en: 'Backend Engineer', industryId: 'IND_TECH', associatedSkillIds: ['SKILL_JAVA', 'SKILL_SPRING_BOOT', 'SKILL_GOLANG', 'SKILL_PYTHON', 'SKILL_NODEJS'] },
  { id: 'ROLE_FRONTEND_DEV', canonicalName: 'Frontend Engineer', vi: 'Kỹ sư phát triển Frontend', en: 'Frontend Engineer', industryId: 'IND_TECH', associatedSkillIds: ['SKILL_REACT', 'SKILL_TYPESCRIPT', 'SKILL_NEXTJS', 'SKILL_VUEJS', 'SKILL_TAILWIND'] },
  { id: 'ROLE_DEVOPS_ENG', canonicalName: 'DevOps / Cloud Engineer', vi: 'Kỹ sư DevOps & Đám mây', en: 'DevOps / Cloud Engineer', industryId: 'IND_DEVOPS_CLOUD', associatedSkillIds: ['SKILL_DOCKER', 'SKILL_KUBERNETES', 'SKILL_AWS', 'SKILL_TERRAFORM', 'SKILL_CICD'] },
  { id: 'ROLE_DATA_ENG', canonicalName: 'Data Engineer', vi: 'Kỹ sư dữ liệu', en: 'Data Engineer', industryId: 'IND_DATA_AI', associatedSkillIds: ['SKILL_DATA_ENG', 'SKILL_SPARK', 'SKILL_POSTGRESQL', 'SKILL_KAFKA'] },
  { id: 'ROLE_AI_RESEARCHER', canonicalName: 'AI / Machine Learning Engineer', vi: 'Kỹ sư Trí tuệ nhân tạo & Máy học', en: 'AI / Machine Learning Engineer', industryId: 'IND_DATA_AI', associatedSkillIds: ['SKILL_MACHINE_LEARNING', 'SKILL_DEEP_LEARNING', 'SKILL_PYTORCH', 'SKILL_TENSORFLOW'] },
  { id: 'ROLE_PRODUCT_MGR', canonicalName: 'Product Manager', vi: 'Giám đốc / Trưởng nhóm Sản phẩm', en: 'Product Manager', industryId: 'IND_PRODUCT', associatedSkillIds: ['SKILL_PRODUCT_MGMT', 'SKILL_AGILE_SCRUM', 'SKILL_ROADMAP_PLANNING'] },
  { id: 'ROLE_UIUX_DESIGNER', canonicalName: 'UI/UX Product Designer', vi: 'Nhà thiết kế sản phẩm UI/UX', en: 'UI/UX Product Designer', industryId: 'IND_DESIGN', associatedSkillIds: ['SKILL_FIGMA', 'SKILL_UIUX_DESIGN', 'SKILL_DESIGN_SYSTEM'] },
  { id: 'ROLE_FINANCIAL_ANALYST', canonicalName: 'Financial Analyst', vi: 'Chuyên viên phân tích tài chính', en: 'Financial Analyst', industryId: 'IND_FINANCE', associatedSkillIds: ['SKILL_FINANCIAL_ANALYSIS', 'SKILL_FINANCIAL_MODELING', 'SKILL_EXCEL_ADVANCED'] },
  { id: 'ROLE_TECH_RECRUITER', canonicalName: 'Technical Recruiter', vi: 'Chuyên viên tuyển dụng công nghệ', en: 'Technical Recruiter', industryId: 'IND_HR', associatedSkillIds: ['SKILL_TECH_RECRUITING', 'SKILL_TALENT_SOURCING', 'SKILL_HR_MGMT'] },
  { id: 'ROLE_DIGITAL_MARKETER', canonicalName: 'Digital Marketing Specialist', vi: 'Chuyên viên Marketing số', en: 'Digital Marketing Specialist', industryId: 'IND_MARKETING', associatedSkillIds: ['SKILL_DIGITAL_MARKETING', 'SKILL_SEO', 'SKILL_GOOGLE_ADS'] }
];

// ============================================================
// 3. CANONICAL SKILL CATALOG (VERIFIED DOMAIN DATA)
// ============================================================

export const TAXONOMY_SKILLS: TaxonomyCatalogSkill[] = [
  // --- SOFTWARE ENGINEERING & IT (BACKEND) ---
  {
    id: 'SKILL_JAVA',
    canonicalName: 'Java',
    normalizedKey: 'java',
    category: 'BACKEND',
    skillType: 'TECHNICAL',
    viName: 'Ngôn ngữ lập trình Java',
    enName: 'Java Programming Language',
    aliases: ['java', 'core java', 'java 17', 'java 21', 'lập trình java', 'ngôn ngữ java'],
    industryIds: ['IND_TECH'],
    roleIds: ['ROLE_BACKEND_DEV'],
    description: 'Enterprise object-oriented programming language'
  },
  {
    id: 'SKILL_SPRING_BOOT',
    canonicalName: 'Spring Boot',
    normalizedKey: 'springboot',
    category: 'BACKEND',
    skillType: 'TECHNICAL',
    viName: 'Framework Java Spring Boot',
    enName: 'Spring Boot Framework',
    aliases: ['spring boot', 'springboot', 'spring framework', 'spring mvc', 'spring data'],
    industryIds: ['IND_TECH'],
    roleIds: ['ROLE_BACKEND_DEV'],
    description: 'Spring Boot framework for microservices and enterprise Java'
  },
  {
    id: 'SKILL_GOLANG',
    canonicalName: 'Go (Golang)',
    normalizedKey: 'golang',
    category: 'BACKEND',
    skillType: 'TECHNICAL',
    viName: 'Ngôn ngữ Go (Golang)',
    enName: 'Go (Golang) Programming Language',
    aliases: ['go', 'golang', 'lập trình go', 'ngôn ngữ go'],
    industryIds: ['IND_TECH'],
    roleIds: ['ROLE_BACKEND_DEV'],
    description: 'High-performance concurrent backend language created by Google'
  },
  {
    id: 'SKILL_PYTHON',
    canonicalName: 'Python',
    normalizedKey: 'python',
    category: 'BACKEND',
    skillType: 'TECHNICAL',
    viName: 'Ngôn ngữ lập trình Python',
    enName: 'Python Programming Language',
    aliases: ['python', 'python3', 'python 3', 'lập trình python', 'py'],
    industryIds: ['IND_TECH', 'IND_DATA_AI'],
    roleIds: ['ROLE_BACKEND_DEV', 'ROLE_AI_RESEARCHER'],
    description: 'High-level programming language for web, automation and AI'
  },
  {
    id: 'SKILL_NODEJS',
    canonicalName: 'Node.js',
    normalizedKey: 'nodejs',
    category: 'BACKEND',
    skillType: 'TECHNICAL',
    viName: 'Môi trường thực thi Node.js',
    enName: 'Node.js Runtime Environment',
    aliases: ['nodejs', 'node.js', 'node js', 'node'],
    industryIds: ['IND_TECH'],
    roleIds: ['ROLE_BACKEND_DEV'],
    description: 'Asynchronous event-driven JavaScript runtime'
  },

  // --- FRONTEND ---
  {
    id: 'SKILL_REACT',
    canonicalName: 'React',
    normalizedKey: 'react',
    category: 'FRONTEND',
    skillType: 'TECHNICAL',
    viName: 'Thư viện React.js',
    enName: 'React UI Library',
    aliases: ['react', 'reactjs', 'react.js', 'react js', 'lập trình react'],
    industryIds: ['IND_TECH'],
    roleIds: ['ROLE_FRONTEND_DEV'],
    description: 'Component-based library for building interactive user interfaces'
  },
  {
    id: 'SKILL_TYPESCRIPT',
    canonicalName: 'TypeScript',
    normalizedKey: 'typescript',
    category: 'FRONTEND',
    skillType: 'TECHNICAL',
    viName: 'Ngôn ngữ TypeScript',
    enName: 'TypeScript Typed Language',
    aliases: ['typescript', 'ts', 'lập trình typescript'],
    industryIds: ['IND_TECH'],
    roleIds: ['ROLE_FRONTEND_DEV', 'ROLE_BACKEND_DEV'],
    description: 'Strongly typed programming language that builds on JavaScript'
  },
  {
    id: 'SKILL_NEXTJS',
    canonicalName: 'Next.js',
    normalizedKey: 'nextjs',
    category: 'FRONTEND',
    skillType: 'TECHNICAL',
    viName: 'Framework Next.js',
    enName: 'Next.js App Router & SSR',
    aliases: ['nextjs', 'next.js', 'next js', 'next'],
    industryIds: ['IND_TECH'],
    roleIds: ['ROLE_FRONTEND_DEV'],
    description: 'Production React framework with SSR, SSG, and Turbopack'
  },
  {
    id: 'SKILL_VUEJS',
    canonicalName: 'Vue.js',
    normalizedKey: 'vuejs',
    category: 'FRONTEND',
    skillType: 'TECHNICAL',
    viName: 'Framework Vue.js',
    enName: 'Vue.js Framework',
    aliases: ['vue', 'vuejs', 'vue.js', 'vue 3'],
    industryIds: ['IND_TECH'],
    roleIds: ['ROLE_FRONTEND_DEV'],
    description: 'Progressive framework for building user interfaces'
  },
  {
    id: 'SKILL_TAILWIND',
    canonicalName: 'Tailwind CSS',
    normalizedKey: 'tailwindcss',
    category: 'FRONTEND',
    skillType: 'TOOL_PLATFORM',
    viName: 'CSS Framework Tailwind',
    enName: 'Tailwind CSS Framework',
    aliases: ['tailwind', 'tailwindcss', 'tailwind css'],
    industryIds: ['IND_TECH'],
    roleIds: ['ROLE_FRONTEND_DEV'],
    description: 'Utility-first CSS framework for rapid modern UI development'
  },

  // --- DATABASE ---
  {
    id: 'SKILL_POSTGRESQL',
    canonicalName: 'PostgreSQL',
    normalizedKey: 'postgresql',
    category: 'DATABASE',
    skillType: 'TECHNICAL',
    viName: 'Hệ quản trị CSDL PostgreSQL',
    enName: 'PostgreSQL Relational Database',
    aliases: ['postgresql', 'postgres', 'psql', 'pgvector', 'cơ sở dữ liệu postgresql'],
    industryIds: ['IND_TECH', 'IND_DATA_AI'],
    description: 'Advanced open source object-relational database system'
  },
  {
    id: 'SKILL_REDIS',
    canonicalName: 'Redis',
    normalizedKey: 'redis',
    category: 'DATABASE',
    skillType: 'TECHNICAL',
    viName: 'Hệ thống In-memory Cache Redis',
    enName: 'Redis In-memory Data Store',
    aliases: ['redis', 'redis cache', 'in-memory cache'],
    industryIds: ['IND_TECH'],
    description: 'In-memory data structure store used as database, cache, and message broker'
  },
  {
    id: 'SKILL_KAFKA',
    canonicalName: 'Apache Kafka',
    normalizedKey: 'apachekafka',
    category: 'BACKEND',
    skillType: 'TECHNICAL',
    viName: 'Nền tảng phân tán Apache Kafka',
    enName: 'Apache Kafka Event Streaming',
    aliases: ['kafka', 'apache kafka', 'kafka stream', 'kafka broker'],
    industryIds: ['IND_TECH', 'IND_DATA_AI'],
    description: 'Distributed event store and stream-processing platform'
  },

  // --- DEVOPS & CLOUD ---
  {
    id: 'SKILL_DOCKER',
    canonicalName: 'Docker',
    normalizedKey: 'docker',
    category: 'DEVOPS',
    skillType: 'TECHNICAL',
    viName: 'Công nghệ đóng gói Docker',
    enName: 'Docker Containerization',
    aliases: ['docker', 'containerization', 'docker compose', 'docker-compose', 'docker swarm'],
    industryIds: ['IND_TECH', 'IND_DEVOPS_CLOUD'],
    roleIds: ['ROLE_DEVOPS_ENG', 'ROLE_BACKEND_DEV'],
    description: 'Platform for developing, shipping, and running applications in containers'
  },
  {
    id: 'SKILL_KUBERNETES',
    canonicalName: 'Kubernetes',
    normalizedKey: 'kubernetes',
    category: 'DEVOPS',
    skillType: 'TECHNICAL',
    viName: 'Hệ thống điều phối Kubernetes (K8s)',
    enName: 'Kubernetes Container Orchestration',
    aliases: ['kubernetes', 'k8s', 'kube', 'k8s cluster'],
    industryIds: ['IND_TECH', 'IND_DEVOPS_CLOUD'],
    roleIds: ['ROLE_DEVOPS_ENG'],
    description: 'Automated container deployment, scaling, and management'
  },
  {
    id: 'SKILL_AWS',
    canonicalName: 'Amazon Web Services (AWS)',
    normalizedKey: 'aws',
    category: 'DEVOPS',
    skillType: 'TOOL_PLATFORM',
    viName: 'Nền tảng đám mây AWS',
    enName: 'Amazon Web Services Cloud',
    aliases: ['aws', 'amazon web services', 'aws cloud', 'ec2', 's3', 'lambda'],
    industryIds: ['IND_TECH', 'IND_DEVOPS_CLOUD'],
    roleIds: ['ROLE_DEVOPS_ENG'],
    description: 'Comprehensive cloud computing platform provided by Amazon'
  },
  {
    id: 'SKILL_TERRAFORM',
    canonicalName: 'Terraform',
    normalizedKey: 'terraform',
    category: 'DEVOPS',
    skillType: 'TOOL_PLATFORM',
    viName: 'Công cụ Terraform (IaC)',
    enName: 'Terraform Infrastructure as Code',
    aliases: ['terraform', 'iac', 'infrastructure as code'],
    industryIds: ['IND_DEVOPS_CLOUD'],
    roleIds: ['ROLE_DEVOPS_ENG'],
    description: 'Open-source infrastructure as code software tool'
  },
  {
    id: 'SKILL_CICD',
    canonicalName: 'CI/CD Pipeline',
    normalizedKey: 'cicd',
    category: 'DEVOPS',
    skillType: 'TECHNICAL',
    viName: 'Quy trình tự động hóa CI/CD',
    enName: 'Continuous Integration / Deployment Pipeline',
    aliases: ['cicd', 'ci/cd', 'github actions', 'gitlab ci', 'jenkins'],
    industryIds: ['IND_TECH', 'IND_DEVOPS_CLOUD'],
    roleIds: ['ROLE_DEVOPS_ENG'],
    description: 'Continuous Integration and Continuous Deployment automation'
  },

  // --- DATA & ARTIFICIAL INTELLIGENCE ---
  {
    id: 'SKILL_MACHINE_LEARNING',
    canonicalName: 'Machine Learning',
    normalizedKey: 'machinelearning',
    category: 'DATA_AI',
    skillType: 'TECHNICAL',
    viName: 'Kỹ thuật Học máy (Machine Learning)',
    enName: 'Machine Learning Algorithms',
    aliases: ['machine learning', 'ml', 'học máy', 'thuat toan ml'],
    industryIds: ['IND_DATA_AI'],
    roleIds: ['ROLE_AI_RESEARCHER'],
    description: 'Study of algorithms that improve automatically through experience'
  },
  {
    id: 'SKILL_DEEP_LEARNING',
    canonicalName: 'Deep Learning',
    normalizedKey: 'deeplearning',
    category: 'DATA_AI',
    skillType: 'TECHNICAL',
    viName: 'Học sâu (Deep Learning)',
    enName: 'Deep Learning & Neural Networks',
    aliases: ['deep learning', 'dl', 'mạng nơ-ron', 'neural network', 'neural networks'],
    industryIds: ['IND_DATA_AI'],
    roleIds: ['ROLE_AI_RESEARCHER'],
    description: 'Neural networks with multiple layers for representation learning'
  },
  {
    id: 'SKILL_PYTORCH',
    canonicalName: 'PyTorch',
    normalizedKey: 'pytorch',
    category: 'DATA_AI',
    skillType: 'TOOL_PLATFORM',
    viName: 'Framework PyTorch',
    enName: 'PyTorch ML Framework',
    aliases: ['pytorch', 'torch', 'py-torch'],
    industryIds: ['IND_DATA_AI'],
    roleIds: ['ROLE_AI_RESEARCHER'],
    description: 'Open source machine learning framework based on Torch library'
  },
  {
    id: 'SKILL_TENSORFLOW',
    canonicalName: 'TensorFlow',
    normalizedKey: 'tensorflow',
    category: 'DATA_AI',
    skillType: 'TOOL_PLATFORM',
    viName: 'Nền tảng TensorFlow',
    enName: 'TensorFlow ML Platform',
    aliases: ['tensorflow', 'tf', 'keras'],
    industryIds: ['IND_DATA_AI'],
    roleIds: ['ROLE_AI_RESEARCHER'],
    description: 'End-to-end open source platform for machine learning'
  },
  {
    id: 'SKILL_DATA_ENG',
    canonicalName: 'Data Engineering',
    normalizedKey: 'dataengineering',
    category: 'DATA_AI',
    skillType: 'TECHNICAL',
    viName: 'Kỹ thuật xử lý Dữ liệu lớn',
    enName: 'Big Data Pipeline Engineering',
    aliases: ['data engineering', 'etl', 'elt', 'data pipeline', 'du lieu lon'],
    industryIds: ['IND_DATA_AI'],
    roleIds: ['ROLE_DATA_ENG'],
    description: 'Designing and building systems for collecting, storing, and analyzing data'
  },
  {
    id: 'SKILL_SPARK',
    canonicalName: 'Apache Spark',
    normalizedKey: 'apachespark',
    category: 'DATA_AI',
    skillType: 'TOOL_PLATFORM',
    viName: 'Hệ thống tính toán Apache Spark',
    enName: 'Apache Spark Distributed Compute',
    aliases: ['spark', 'apache spark', 'pyspark'],
    industryIds: ['IND_DATA_AI'],
    roleIds: ['ROLE_DATA_ENG'],
    description: 'Unified analytics engine for large-scale data processing'
  },

  // --- PRODUCT & PROJECT MANAGEMENT ---
  {
    id: 'SKILL_PRODUCT_MGMT',
    canonicalName: 'Product Management',
    normalizedKey: 'productmanagement',
    category: 'PRODUCT',
    skillType: 'DOMAIN_KNOWLEDGE',
    viName: 'Quản lý Sản phẩm công nghệ',
    enName: 'Product Management & Lifecycle',
    aliases: ['product management', 'quan ly san pham', 'product discovery', 'prd'],
    industryIds: ['IND_PRODUCT'],
    roleIds: ['ROLE_PRODUCT_MGR'],
    description: 'Guiding the success of a product and leading the cross-functional team'
  },
  {
    id: 'SKILL_AGILE_SCRUM',
    canonicalName: 'Agile & Scrum',
    normalizedKey: 'agilescrum',
    category: 'MANAGEMENT',
    skillType: 'DOMAIN_KNOWLEDGE',
    viName: 'Phương pháp Agile / Scrum',
    enName: 'Agile & Scrum Methodologies',
    aliases: ['agile', 'scrum', 'sprint planning', 'scrum master', 'kanban'],
    industryIds: ['IND_PRODUCT', 'IND_TECH'],
    roleIds: ['ROLE_PRODUCT_MGR'],
    description: 'Iterative approach to software delivery and team collaboration'
  },
  {
    id: 'SKILL_ROADMAP_PLANNING',
    canonicalName: 'Roadmap Planning',
    normalizedKey: 'roadmapplanning',
    category: 'PRODUCT',
    skillType: 'DOMAIN_KNOWLEDGE',
    viName: 'Lập lộ trình sản phẩm',
    enName: 'Product Strategy & Roadmap',
    aliases: ['roadmap', 'product roadmap', 'ke hoach san pham'],
    industryIds: ['IND_PRODUCT'],
    roleIds: ['ROLE_PRODUCT_MGR'],
    description: 'Strategic visioning and timeline planning for feature releases'
  },

  // --- UI/UX & DESIGN ---
  {
    id: 'SKILL_FIGMA',
    canonicalName: 'Figma',
    normalizedKey: 'figma',
    category: 'DESIGN',
    skillType: 'TOOL_PLATFORM',
    viName: 'Công cụ thiết kế Figma',
    enName: 'Figma Interface Design',
    aliases: ['figma', 'figma design', 'figma ui', 'figma prototype'],
    industryIds: ['IND_DESIGN'],
    roleIds: ['ROLE_UIUX_DESIGNER'],
    description: 'Collaborative cloud-based interface design and prototyping tool'
  },
  {
    id: 'SKILL_UIUX_DESIGN',
    canonicalName: 'UI/UX Design',
    normalizedKey: 'uiuxdesign',
    category: 'DESIGN',
    skillType: 'TECHNICAL',
    viName: 'Thiết kế Trải nghiệm & Giao diện (UI/UX)',
    enName: 'User Experience & User Interface Design',
    aliases: ['uiux', 'ui/ux', 'thiet ke giao dien', 'user research', 'wireframing'],
    industryIds: ['IND_DESIGN'],
    roleIds: ['ROLE_UIUX_DESIGNER'],
    description: 'Crafting intuitive visual interfaces and engaging user journeys'
  },
  {
    id: 'SKILL_DESIGN_SYSTEM',
    canonicalName: 'Design Systems',
    normalizedKey: 'designsystems',
    category: 'DESIGN',
    skillType: 'TECHNICAL',
    viName: 'Xây dựng Design System',
    enName: 'Design System Architecture',
    aliases: ['design system', 'design tokens', 'component library'],
    industryIds: ['IND_DESIGN', 'IND_TECH'],
    roleIds: ['ROLE_UIUX_DESIGNER', 'ROLE_FRONTEND_DEV'],
    description: 'Reusable design standards, UI tokens, and component guidelines'
  },

  // --- MARKETING & SALES ---
  {
    id: 'SKILL_DIGITAL_MARKETING',
    canonicalName: 'Digital Marketing',
    normalizedKey: 'digitalmarketing',
    category: 'MARKETING',
    skillType: 'DOMAIN_KNOWLEDGE',
    viName: 'Tiếp thị Kỹ thuật số (Digital Marketing)',
    enName: 'Digital Marketing & Growth',
    aliases: ['digital marketing', 'online marketing', 'tiep thi so'],
    industryIds: ['IND_MARKETING'],
    roleIds: ['ROLE_DIGITAL_MARKETER'],
    description: 'Online channel promotion, conversion funnels, and customer acquisition'
  },
  {
    id: 'SKILL_SEO',
    canonicalName: 'Search Engine Optimization (SEO)',
    normalizedKey: 'seo',
    category: 'MARKETING',
    skillType: 'TECHNICAL',
    viName: 'Tối ưu hóa công cụ tìm kiếm (SEO)',
    enName: 'Search Engine Optimization',
    aliases: ['seo', 'search engine optimization', 'on-page seo', 'technical seo'],
    industryIds: ['IND_MARKETING'],
    roleIds: ['ROLE_DIGITAL_MARKETER'],
    description: 'Improving website visibility and organic search engine rankings'
  },
  {
    id: 'SKILL_GOOGLE_ADS',
    canonicalName: 'Google Ads & Performance',
    normalizedKey: 'googleads',
    category: 'MARKETING',
    skillType: 'TOOL_PLATFORM',
    viName: 'Chạy quảng cáo Google Ads',
    enName: 'Google Ads & Performance Marketing',
    aliases: ['google ads', 'adwords', 'sem', 'quang cao google'],
    industryIds: ['IND_MARKETING'],
    roleIds: ['ROLE_DIGITAL_MARKETER'],
    description: 'Pay-per-click advertising and paid search campaign management'
  },
  {
    id: 'SKILL_B2B_SALES',
    canonicalName: 'B2B Sales',
    normalizedKey: 'b2bsales',
    category: 'SALES',
    skillType: 'DOMAIN_KNOWLEDGE',
    viName: 'Kinh doanh Doanh nghiệp (B2B Sales)',
    enName: 'Business-to-Business Sales',
    aliases: ['b2b', 'b2b sales', 'ban hang b2b', 'enterprise sales'],
    industryIds: ['IND_SALES'],
    description: 'Negotiating and closing corporate business agreements'
  },

  // --- FINANCE & ACCOUNTING ---
  {
    id: 'SKILL_FINANCIAL_ANALYSIS',
    canonicalName: 'Financial Analysis',
    normalizedKey: 'financialanalysis',
    category: 'FINANCE',
    skillType: 'DOMAIN_KNOWLEDGE',
    viName: 'Phân tích Tài chính',
    enName: 'Financial Analysis & Valuation',
    aliases: ['financial analysis', 'phan tich tai chinh', 'valuation'],
    industryIds: ['IND_FINANCE'],
    roleIds: ['ROLE_FINANCIAL_ANALYST'],
    description: 'Evaluating business performance, solvency, and investment viability'
  },
  {
    id: 'SKILL_FINANCIAL_MODELING',
    canonicalName: 'Financial Modeling',
    normalizedKey: 'financialmodeling',
    category: 'FINANCE',
    skillType: 'TECHNICAL',
    viName: 'Mô hình hóa Tài chính',
    enName: 'Financial Modeling & Forecasting',
    aliases: ['financial modeling', 'mo hinh tai chinh', 'dcf'],
    industryIds: ['IND_FINANCE'],
    roleIds: ['ROLE_FINANCIAL_ANALYST'],
    description: 'Building mathematical representations of financial performance'
  },
  {
    id: 'SKILL_EXCEL_ADVANCED',
    canonicalName: 'Advanced Microsoft Excel',
    normalizedKey: 'advancedexcel',
    category: 'FINANCE',
    skillType: 'TOOL_PLATFORM',
    viName: 'Kỹ năng Excel nâng cao',
    enName: 'Advanced Excel & Data Analysis',
    aliases: ['excel', 'advanced excel', 'vba', 'vlookup', 'pivot table'],
    industryIds: ['IND_FINANCE', 'IND_ACCOUNTING', 'IND_BIZ_OPS'],
    roleIds: ['ROLE_FINANCIAL_ANALYST'],
    description: 'Complex spreadsheet modeling, macros, and financial formula mastery'
  },
  {
    id: 'SKILL_CORP_ACCOUNTING',
    canonicalName: 'Corporate Accounting',
    normalizedKey: 'corporateaccounting',
    category: 'ACCOUNTING',
    skillType: 'DOMAIN_KNOWLEDGE',
    viName: 'Kế toán Doanh nghiệp',
    enName: 'Corporate Accounting & Reporting',
    aliases: ['accounting', 'ke toan', 'financial reporting', 'vas', 'ifrs'],
    industryIds: ['IND_ACCOUNTING'],
    description: 'Recording transactions, statutory compliance, and audit preparation'
  },

  // --- HUMAN RESOURCES ---
  {
    id: 'SKILL_TECH_RECRUITING',
    canonicalName: 'Technical Recruiting',
    normalizedKey: 'technicalrecruiting',
    category: 'HR',
    skillType: 'DOMAIN_KNOWLEDGE',
    viName: 'Tuyển dụng Nhân sự Công nghệ',
    enName: 'Technical Talent Acquisition',
    aliases: ['tech recruiting', 'tuyen dung it', 'headhunt', 'talent acquisition'],
    industryIds: ['IND_HR'],
    roleIds: ['ROLE_TECH_RECRUITER'],
    description: 'Sourcing, screening, and closing engineering and IT candidates'
  },
  {
    id: 'SKILL_TALENT_SOURCING',
    canonicalName: 'Talent Sourcing',
    normalizedKey: 'talentsourcing',
    category: 'HR',
    skillType: 'DOMAIN_KNOWLEDGE',
    viName: 'Tìm kiếm nguồn ứng viên (Sourcing)',
    enName: 'Candidate Sourcing & Outreach',
    aliases: ['sourcing', 'linkedin recruiter', 'candidate sourcing'],
    industryIds: ['IND_HR'],
    roleIds: ['ROLE_TECH_RECRUITER'],
    description: 'Active talent discovery across professional networks and platforms'
  },
  {
    id: 'SKILL_HR_MGMT',
    canonicalName: 'HR Management & Operations',
    normalizedKey: 'hrmanagement',
    category: 'HR',
    skillType: 'DOMAIN_KNOWLEDGE',
    viName: 'Quản trị Nhân sự & Vận hành',
    enName: 'Human Resources Management',
    aliases: ['hr management', 'quan tri nhan su', 'hr operations', 'c&b'],
    industryIds: ['IND_HR'],
    roleIds: ['ROLE_TECH_RECRUITER'],
    description: 'Organizational policies, compensation, benefits, and employee relations'
  },

  // --- CYBERSECURITY ---
  {
    id: 'SKILL_CYBERSECURITY',
    canonicalName: 'Cybersecurity',
    normalizedKey: 'cybersecurity',
    category: 'SECURITY',
    skillType: 'TECHNICAL',
    viName: 'An toàn & Bảo mật Thông tin',
    enName: 'Cybersecurity & InfoSec',
    aliases: ['cybersecurity', 'infosec', 'an toan thong tin', 'bao mat mang'],
    industryIds: ['IND_SECURITY'],
    description: 'Protection of computer systems and networks from malicious attacks'
  },

  // --- CROSS-DOMAIN / SOFT SKILLS ---
  {
    id: 'SKILL_PROBLEM_SOLVING',
    canonicalName: 'Problem Solving',
    normalizedKey: 'problemsolving',
    category: 'SOFT_SKILL',
    skillType: 'SOFT_SKILL',
    viName: 'Kỹ năng giải quyết vấn đề',
    enName: 'Analytical Problem Solving',
    aliases: ['problem solving', 'giai quyet van de', 'analytical thinking'],
    industryIds: ['IND_CROSS_DOMAIN'],
    description: 'Decomposing complex friction points and structuring effective remedies'
  },
  {
    id: 'SKILL_TEAM_LEADERSHIP',
    canonicalName: 'Team Leadership',
    normalizedKey: 'teamleadership',
    category: 'SOFT_SKILL',
    skillType: 'SOFT_SKILL',
    viName: 'Kỹ năng Lãnh đạo & Dẫn dắt đội ngũ',
    enName: 'Team Leadership & Mentoring',
    aliases: ['leadership', 'lanh dao', 'team lead', 'mentoring'],
    industryIds: ['IND_CROSS_DOMAIN'],
    description: 'Guiding, coaching, and inspiring colleagues toward collective goals'
  },
  {
    id: 'SKILL_COMMUNICATION',
    canonicalName: 'Communication',
    normalizedKey: 'communication',
    category: 'SOFT_SKILL',
    skillType: 'SOFT_SKILL',
    viName: 'Giao tiếp & Thuyết trình chuyên nghiệp',
    enName: 'Professional Communication',
    aliases: ['communication', 'giao tiep', 'presentation', 'thuyet trinh'],
    industryIds: ['IND_CROSS_DOMAIN'],
    description: 'Articulating complex ideas clearly across technical and executive audiences'
  }
];

// ============================================================
// 4. TAXONOMY NORMALIZATION & SEARCH UTILITIES
// ============================================================

export function normalizeTaxonomyKey(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accent marks
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, '');
}

export function searchTaxonomyCatalog(
  query: string,
  options: {
    industryId?: string;
    category?: string;
    skillType?: SkillType;
    excludeSkillNames?: string[];
    favoriteSkillIds?: string[];
    onlyFavorites?: boolean;
    limit?: number;
  } = {}
): TaxonomyCatalogSkill[] {
  const {
    industryId,
    category,
    skillType,
    excludeSkillNames = [],
    favoriteSkillIds = [],
    onlyFavorites = false,
    limit = 12
  } = options;

  const rawQ = query.trim().toLowerCase();
  const normQ = normalizeTaxonomyKey(query);
  const normalizedExcludes = new Set(excludeSkillNames.map((s) => normalizeTaxonomyKey(s)));

  let filtered = TAXONOMY_SKILLS.filter((skill) => {
    // 1. Exclude already chosen skills
    if (normalizedExcludes.has(skill.normalizedKey)) {
      return false;
    }

    // 2. Filter by favorite status
    if (onlyFavorites && !favoriteSkillIds.includes(skill.id)) {
      return false;
    }

    // 3. Filter by industry
    if (industryId && industryId !== 'ALL' && !skill.industryIds.includes(industryId) && !skill.industryIds.includes('IND_CROSS_DOMAIN')) {
      return false;
    }

    // 4. Filter by category
    if (category && category !== 'ALL' && skill.category !== category) {
      return false;
    }

    // 5. Filter by skill type
    if (skillType && skill.skillType !== skillType) {
      return false;
    }

    // 6. Query matching (if provided)
    if (!rawQ) return true;

    // Direct name match or normalized match
    if (skill.canonicalName.toLowerCase().includes(rawQ) || skill.normalizedKey.includes(normQ)) {
      return true;
    }

    // Vietnamese name match
    if (normalizeTaxonomyKey(skill.viName).includes(normQ)) {
      return true;
    }

    // Alias match
    if (skill.aliases.some((alias) => alias.toLowerCase().includes(rawQ) || normalizeTaxonomyKey(alias).includes(normQ))) {
      return true;
    }

    return false;
  });

  // Rank deterministically
  if (rawQ) {
    filtered.sort((a, b) => {
      const aExact = a.canonicalName.toLowerCase() === rawQ || a.normalizedKey === normQ;
      const bExact = b.canonicalName.toLowerCase() === rawQ || b.normalizedKey === normQ;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aPrefix = a.canonicalName.toLowerCase().startsWith(rawQ) || a.normalizedKey.startsWith(normQ);
      const bPrefix = b.canonicalName.toLowerCase().startsWith(rawQ) || b.normalizedKey.startsWith(normQ);
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;

      // Prioritize favorites in search results
      const aFav = favoriteSkillIds.includes(a.id);
      const bFav = favoriteSkillIds.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      return a.canonicalName.localeCompare(b.canonicalName);
    });
  } else {
    // When query is empty, favorited skills appear first, then sorted by canonical name
    filtered.sort((a, b) => {
      const aFav = favoriteSkillIds.includes(a.id);
      const bFav = favoriteSkillIds.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.canonicalName.localeCompare(b.canonicalName);
    });
  }

  return filtered.slice(0, limit);
}

// ============================================================
// 5. CATALOG DATA VALIDATION AND STATISTICAL AUDIT
// ============================================================

export interface TaxonomyCatalogAudit {
  totalIndustries: number;
  totalJobFamilies: number;
  totalSkills: number;
  totalAliases: number;
  validationErrors: string[];
  isValid: boolean;
}

export function validateTaxonomyCatalog(): TaxonomyCatalogAudit {
  const errors: string[] = [];

  // Check unique industry IDs
  const industryIdSet = new Set<string>();
  for (const ind of TAXONOMY_INDUSTRIES) {
    if (industryIdSet.has(ind.id)) {
      errors.push(`Duplicate industry ID: ${ind.id}`);
    }
    industryIdSet.add(ind.id);
  }

  // Check unique skill IDs and normalized keys
  const skillIdSet = new Set<string>();
  const skillKeySet = new Set<string>();
  let totalAliases = 0;

  for (const skill of TAXONOMY_SKILLS) {
    if (!skill.id || skill.id.trim() === '') {
      errors.push(`Skill with empty ID found: ${skill.canonicalName}`);
    }
    if (skillIdSet.has(skill.id)) {
      errors.push(`Duplicate skill ID: ${skill.id}`);
    }
    skillIdSet.add(skill.id);

    if (skillKeySet.has(skill.normalizedKey)) {
      errors.push(`Duplicate normalized key: ${skill.normalizedKey} (${skill.canonicalName})`);
    }
    skillKeySet.add(skill.normalizedKey);

    // Verify industry references
    for (const indId of skill.industryIds) {
      if (!industryIdSet.has(indId)) {
        errors.push(`Dangling industry reference in skill ${skill.id}: ${indId}`);
      }
    }

    totalAliases += skill.aliases.length;
  }

  // Check job families
  for (const family of TAXONOMY_JOB_FAMILIES) {
    if (!industryIdSet.has(family.industryId)) {
      errors.push(`Dangling industry reference in job family ${family.id}: ${family.industryId}`);
    }
    for (const skillId of family.associatedSkillIds) {
      if (!skillIdSet.has(skillId)) {
        errors.push(`Dangling skill reference in job family ${family.id}: ${skillId}`);
      }
    }
  }

  return {
    totalIndustries: TAXONOMY_INDUSTRIES.length,
    totalJobFamilies: TAXONOMY_JOB_FAMILIES.length,
    totalSkills: TAXONOMY_SKILLS.length,
    totalAliases,
    validationErrors: errors,
    isValid: errors.length === 0
  };
}
