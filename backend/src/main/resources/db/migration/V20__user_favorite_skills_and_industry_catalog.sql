-- ============================================================
-- V20__user_favorite_skills_and_industry_catalog.sql
-- PER-USER FAVORITE SKILLS TABLE & COMPREHENSIVE TAXONOMY SEEDS
-- ============================================================

-- 1. Table: user_favorite_skills (Per-user persistent favorites, capped at 10 server-side)
CREATE TABLE IF NOT EXISTS user_favorite_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES taxonomy_skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_favorite_skill UNIQUE (user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_skills_user ON user_favorite_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_skills_skill ON user_favorite_skills(skill_id);

-- 2. Seed Comprehensive Multi-Industry Skill Reference Catalog
DO $$
DECLARE
    -- Helper procedure-like block
BEGIN
    -- Software & Backend
    INSERT INTO taxonomy_skills (canonical_name, normalized_name, category, description)
    VALUES
      ('Go (Golang)', 'golang', 'BACKEND', 'High-performance concurrent programming language'),
      ('Node.js', 'nodejs', 'BACKEND', 'Asynchronous event-driven JavaScript runtime'),
      ('Kubernetes', 'kubernetes', 'DEVOPS', 'Container orchestration and automation system'),
      ('Amazon Web Services (AWS)', 'aws', 'DEVOPS', 'Cloud infrastructure and managed computing services'),
      ('Google Cloud Platform (GCP)', 'gcp', 'DEVOPS', 'Suite of cloud computing services by Google'),
      ('Microsoft Azure', 'azure', 'DEVOPS', 'Enterprise cloud computing and infrastructure services'),
      ('Terraform', 'terraform', 'DEVOPS', 'Infrastructure as Code provisioning tool'),
      ('CI/CD Pipeline', 'cicd', 'DEVOPS', 'Continuous Integration and Continuous Deployment automation'),
      -- Frontend
      ('Vue.js', 'vuejs', 'FRONTEND', 'Progressive JavaScript framework for building UIs'),
      ('Angular', 'angular', 'FRONTEND', 'Component-based framework for scalable web applications'),
      ('Next.js', 'nextjs', 'FRONTEND', 'React framework for server-side rendering and web apps'),
      ('Tailwind CSS', 'tailwindcss', 'FRONTEND', 'Utility-first CSS framework for modern web design'),
      -- Data & AI/ML
      ('Machine Learning', 'machinelearning', 'DATA_AI', 'Algorithms and statistical models that learn from data'),
      ('Deep Learning', 'deeplearning', 'DATA_AI', 'Multi-layer artificial neural networks and representation learning'),
      ('PyTorch', 'pytorch', 'DATA_AI', 'Open source machine learning and deep learning framework'),
      ('TensorFlow', 'tensorflow', 'DATA_AI', 'End-to-end open source platform for machine learning'),
      ('Data Engineering', 'dataengineering', 'DATA_AI', 'Building systems and data pipelines for large-scale analysis'),
      ('Apache Spark', 'apachespark', 'DATA_AI', 'Unified analytics engine for large-scale data processing'),
      ('SQL & Data Modeling', 'sqldatamodeling', 'DATABASE', 'Relational querying, schema design, and query optimization'),
      -- Product & Management
      ('Product Management', 'productmanagement', 'PRODUCT', 'Leading cross-functional teams to build and scale products'),
      ('Agile & Scrum', 'agilescrum', 'MANAGEMENT', 'Iterative software delivery and sprint management'),
      ('Business Analysis', 'businessanalysis', 'MANAGEMENT', 'Analyzing business needs and requirements engineering'),
      -- Design
      ('UI/UX Design', 'uiuxdesign', 'DESIGN', 'User interface design and user experience architecture'),
      ('Figma', 'figma', 'DESIGN', 'Collaborative interface design and interactive prototyping'),
      -- Marketing & Sales
      ('Digital Marketing', 'digitalmarketing', 'MARKETING', 'Search engine optimization, paid ads, and brand marketing'),
      ('Search Engine Optimization (SEO)', 'seo', 'MARKETING', 'Organic search ranking and technical content optimization'),
      ('B2B Sales', 'b2bsales', 'SALES', 'Business-to-business deal closing and pipeline management'),
      -- Finance & Accounting
      ('Financial Analysis', 'financialanalysis', 'FINANCE', 'Financial modeling, valuation, and forecasting'),
      ('Corporate Accounting', 'corporateaccounting', 'ACCOUNTING', 'Financial reporting, audit readiness, and accounting standards'),
      -- HR & People
      ('Technical Recruiting', 'technicalrecruiting', 'HR', 'Sourcing, screening, and hiring technical talent'),
      ('HR Management', 'hrmanagement', 'HR', 'Human resources policies, talent retention, and operations'),
      -- Cybersecurity
      ('Cybersecurity', 'cybersecurity', 'SECURITY', 'Information security, vulnerability assessment, and threat mitigation'),
      -- Soft Skills
      ('Problem Solving', 'problemsolving', 'SOFT_SKILL', 'Critical thinking and analytical problem decomposition'),
      ('Team Leadership', 'teamleadership', 'SOFT_SKILL', 'Mentoring, alignment, and cross-functional leadership'),
      ('Communication', 'communication', 'SOFT_SKILL', 'Clear written and verbal stakeholder communication')
    ON CONFLICT (canonical_name) DO NOTHING;

    -- Insert Aliases for newly added skills
    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'Golang', 'golang' FROM taxonomy_skills WHERE canonical_name = 'Go (Golang)'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'Go', 'go' FROM taxonomy_skills WHERE canonical_name = 'Go (Golang)'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'NodeJS', 'nodejs' FROM taxonomy_skills WHERE canonical_name = 'Node.js'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'Node', 'node' FROM taxonomy_skills WHERE canonical_name = 'Node.js'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'K8s', 'k8s' FROM taxonomy_skills WHERE canonical_name = 'Kubernetes'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'AWS', 'aws' FROM taxonomy_skills WHERE canonical_name = 'Amazon Web Services (AWS)'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'GCP', 'gcp' FROM taxonomy_skills WHERE canonical_name = 'Google Cloud Platform (GCP)'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'Azure', 'azure' FROM taxonomy_skills WHERE canonical_name = 'Microsoft Azure'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'ML', 'ml' FROM taxonomy_skills WHERE canonical_name = 'Machine Learning'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'Học máy', 'hocmay' FROM taxonomy_skills WHERE canonical_name = 'Machine Learning'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'DeepLearning', 'deeplearning' FROM taxonomy_skills WHERE canonical_name = 'Deep Learning'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'SEO Marketing', 'seomarketing' FROM taxonomy_skills WHERE canonical_name = 'Search Engine Optimization (SEO)'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'Scrum', 'scrum' FROM taxonomy_skills WHERE canonical_name = 'Agile & Scrum'
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    SELECT id, 'Figma Design', 'figmadesign' FROM taxonomy_skills WHERE canonical_name = 'Figma'
    ON CONFLICT (alias) DO NOTHING;
END $$;
