import { describe, it, expect } from 'vitest';
import { parseRawJobDescription } from './jdParser';

describe('parseRawJobDescription (Regex & Heuristics Benchmark)', () => {
  // Sample 1: Standard Markdown English JD
  it('Sample 1: correctly parses Standard Senior Frontend JD', () => {
    const jd1 = `
# Senior Frontend Engineer
Company: TechCorp Solutions

About the Company:
TechCorp is a leading FinTech startup empowering millions of global merchants.

Responsibilities:
- Architect and develop responsive, high-performance web applications using React and Next.js.
- Collaborate with UX designers and backend engineers to integrate RESTful and GraphQL APIs.
- Mentor junior developers and enforce unit testing standards with Jest and Cypress.

Requirements:
- 5+ years of experience in modern frontend development.
- Deep expertise in TypeScript, React, Tailwind CSS, and state management (Zustand/Redux).
- Proven track record in web performance optimization and Core Web Vitals.
- Strong knowledge of CI/CD and Docker.
    `;

    const result = parseRawJobDescription(jd1);
    expect(result.title).toBe('Senior Frontend Engineer');
    expect(result.company).toBe('TechCorp Solutions');
    expect(result.experienceLevel).toBe('senior');
    expect(result.responsibilities.length).toBe(3);
    expect(result.requirements.length).toBe(4);
    expect(result.suggestedCustomPrompt).toContain('Senior Frontend Engineer');
    expect(result.suggestedCustomPrompt).toContain('TechCorp Solutions');
    expect(result.suggestedCustomPrompt).toContain('React');
  });

  // Sample 2: Vietnamese format with prefixes
  it('Sample 2: correctly parses Vietnamese Golang Backend JD', () => {
    const jd2 = `
Công ty: VNG Cloud
Vị trí: Backend Developer (Golang)

Mô tả công việc:
- Phát triển hệ thống microservices chịu tải cao phục vụ hơn 10 triệu người dùng.
- Thiết kế cơ sở dữ liệu PostgreSQL và Redis caching tối ưu tốc độ phản hồi.
- Tích hợp hệ thống message queue Apache Kafka và gRPC.

Yêu cầu ứng viên:
- Có ít nhất 3 năm kinh nghiệm lập trình Golang hoặc Java.
- Nắm vững kiến trúc Microservices, Docker, Kubernetes.
- Có tư duy thuật toán tốt và hiểu biết về bảo mật hệ thống.

Quyền lợi:
- Thu nhập cạnh tranh từ 35M - 50M.
- Thưởng lương tháng 13 và bảo hiểm sức khỏe cao cấp.
    `;

    const result = parseRawJobDescription(jd2);
    expect(result.company).toBe('VNG Cloud');
    expect(result.title).toContain('Backend Developer (Golang)');
    expect(result.responsibilities.length).toBe(3);
    expect(result.requirements.length).toBe(3);
    expect(result.suggestedCustomPrompt).toContain('VNG Cloud');
    expect(result.suggestedCustomPrompt).toContain('Golang');
  });

  // Sample 3: Leading format "About [Company]" with Tech Lead role
  it('Sample 3: correctly parses Tech Lead JD with About Acme Corp format', () => {
    const jd3 = `
Role: Technical Lead - Cloud & DevOps
About Acme Logistics:
Acme Logistics is modernizing global supply chains with cutting-edge cloud infrastructure.

Key Responsibilities:
1. Lead a team of 8 DevOps and Cloud engineers.
2. Build infrastructure as code using Terraform on AWS and GCP.
3. Drive zero-downtime deployment pipelines with Kubernetes.

Qualifications:
1. 7+ years in DevOps / SRE with team leadership experience.
2. Expert in AWS, Kubernetes, Terraform, and CI/CD pipelines.
3. Strong communication and stakeholder management skills.
    `;

    const result = parseRawJobDescription(jd3);
    expect(result.title).toBe('Technical Lead - Cloud & DevOps');
    expect(result.company).toBe('Acme Logistics');
    expect(result.experienceLevel).toBe('lead');
    expect(result.responsibilities.length).toBe(3);
    expect(result.requirements.length).toBe(3);
    expect(result.suggestedCustomPrompt).toContain('mentorship');
  });

  // Sample 4: Fresher / Intern role
  it('Sample 4: correctly parses Intern / Fresher Mobile Developer JD', () => {
    const jd4 = `
Tuyển dụng: Thực tập sinh Mobile Developer (Flutter / React Native)
Doanh nghiệp: Shopee Vietnam

What you will do:
- Tham gia xây dựng các tính năng mới trên ứng dụng di động Shopee.
- Fix bug và tối ưu giao diện UI theo thiết kế Figma.
- Phối hợp cùng các Senior Engineer trong quá trình code review.

What you will need:
- Sinh viên năm cuối hoặc mới tốt nghiệp chuyên ngành CNTT.
- Đã từng làm dự án với Flutter hoặc React Native.
- Chăm chỉ, chủ động và ham học hỏi công nghệ mới.
    `;

    const result = parseRawJobDescription(jd4);
    expect(result.company).toBe('Shopee Vietnam');
    expect(result.title).toContain('Thực tập sinh Mobile Developer');
    expect(result.experienceLevel).toBe('intern');
    expect(result.responsibilities.length).toBe(3);
    expect(result.requirements.length).toBe(3);
  });

  // Sample 5: AI / Machine Learning Engineer
  it('Sample 5: correctly parses AI Engineer JD', () => {
    const jd5 = `
Title: Senior AI Engineer (LLMs & RAG)
Company: OpenAI Partner Labs

Responsibilities:
* Fine-tune open-source LLMs and implement advanced RAG architectures.
* Optimize vector databases and embedding pipelines using Python and FastAPI.
* Deploy models to production with low latency on GPU clusters.

Requirements:
* 4+ years of experience with Python, PyTorch, LangChain, and vector databases.
* Strong background in Transformer architectures, Prompt Engineering, and Agentic workflows.
* Experience with Docker and cloud deployments (AWS/GCP).
    `;

    const result = parseRawJobDescription(jd5);
    expect(result.title).toBe('Senior AI Engineer (LLMs & RAG)');
    expect(result.company).toBe('OpenAI Partner Labs');
    expect(result.experienceLevel).toBe('senior');
    expect(result.responsibilities.length).toBe(3);
    expect(result.requirements.length).toBe(3);
    expect(result.suggestedCustomPrompt).toContain('Python');
  });

  // Sample 6: Fullstack Developer with "At [Company]" inline text
  it('Sample 6: correctly extracts company from "At [Company]" sentence', () => {
    const jd6 = `
Full-Stack Developer (Node.js & Vue.js)
At Grab, we are building the everyday superapp for Southeast Asia.

What You Will Do:
- Develop scalable backend APIs with Node.js and TypeScript.
- Build clean frontend interfaces with Vue.js and Tailwind CSS.
- Monitor production services in an Agile / Scrum team.

Must Have:
- 3+ years experience with Node.js, Express, and Vue.js.
- Strong SQL proficiency with PostgreSQL and MySQL.
- Experience with Unit Test and Jest.
    `;

    const result = parseRawJobDescription(jd6);
    expect(result.title).toBe('Full-Stack Developer (Node.js & Vue.js)');
    expect(result.company).toBe('Grab');
    expect(result.responsibilities.length).toBe(3);
    expect(result.requirements.length).toBe(3);
  });

  // Sample 7: QA Automation Engineer with numbered lists
  it('Sample 7: correctly parses QA Automation Engineer JD', () => {
    const jd7 = `
Position: QA Automation Engineer
Company: FPT Software

Mô tả công việc:
1. Viết kịch bản kiểm thử tự động (Automation Test) cho Web và Mobile API.
2. Thực thi regression test và phối hợp cùng Dev để tìm và sửa lỗi.
3. Xây dựng báo cáo kiểm thử chất lượng định kỳ cho khách hàng quốc tế.

Yêu cầu:
1. Có từ 2 năm kinh nghiệm QA/QC automation test.
2. Thành thạo Selenium, Cypress hoặc Playwright.
3. Kỹ năng giao tiếp tiếng Anh tốt.
    `;

    const result = parseRawJobDescription(jd7);
    expect(result.title).toBe('QA Automation Engineer');
    expect(result.company).toBe('FPT Software');
    expect(result.responsibilities.length).toBe(3);
    expect(result.requirements.length).toBe(3);
  });

  // Sample 8: Data Analyst / Engineer with bullet points
  it('Sample 8: correctly parses Data Analyst JD', () => {
    const jd8 = `
Chức danh: Data Analyst
Công ty: Tiki Corporation

Duties:
• Xây dựng và duy trì các dashboard phân tích kinh doanh bằng PowerBI / Tableau.
• Phân tích hành vi người dùng và đưa ra insights tối ưu tỷ lệ chuyển đổi.
• Viết các truy vấn SQL phức tạp để trích xuất dữ liệu từ Data Warehouse.

Skills & Experience:
• Thành thạo SQL, Python (Pandas, NumPy) và trực quan hóa dữ liệu.
• Có 2+ năm kinh nghiệm trong lĩnh vực E-commerce hoặc Fintech.
• Tư duy phân tích logic và kỹ năng trình bày số liệu.
    `;

    const result = parseRawJobDescription(jd8);
    expect(result.title).toBe('Data Analyst');
    expect(result.company).toBe('Tiki Corporation');
    expect(result.responsibilities.length).toBe(3);
    expect(result.requirements.length).toBe(3);
  });

  // Sample 9: Java Spring Boot Developer
  it('Sample 9: correctly parses Java Spring Boot Developer JD', () => {
    const jd9 = `
Java Developer (Spring Boot)
Employer: Viettel Solutions

Key Responsibilities:
- Tham gia phát triển hệ thống Core Banking và giải pháp viễn thông.
- Thiết kế kiến trúc module, microservices và bảo mật theo chuẩn OAuth2 / JWT.
- Tối ưu hóa database Oracle và PostgreSQL.

Requirements:
- 3+ năm kinh nghiệm lập trình Java, thành thạo Spring Boot, Hibernate.
- Hiểu biết về Microservices, Kafka, Redis.
- Tinh thần trách nhiệm cao, làm việc nhóm tốt.
    `;

    const result = parseRawJobDescription(jd9);
    expect(result.title).toBe('Java Developer (Spring Boot)');
    expect(result.company).toBe('Viettel Solutions');
    expect(result.responsibilities.length).toBe(3);
    expect(result.requirements.length).toBe(3);
    expect(result.suggestedCustomPrompt).toContain('Java');
  });

  // Sample 10: DevOps Engineer with pure unstructured text dump
  it('Sample 10: handles unformatted raw dump gracefully', () => {
    const jd10 = `
DevOps Engineer
Join Zalopay to scale payment systems processing billions of VND daily.
What you'll do
Build CI/CD pipelines
Manage AWS Kubernetes clusters
Monitor system reliability
What you'll need
Docker and Kubernetes expertise
3 years of cloud engineering experience
    `;

    const result = parseRawJobDescription(jd10);
    expect(result.title).toBe('DevOps Engineer');
    expect(result.company).toBe('Zalopay');
    expect(result.responsibilities.length).toBe(3);
    expect(result.requirements.length).toBe(2);
  });

  // Sample 11: Empty / invalid input
  it('Sample 11: handles empty string safely without crashing', () => {
    const result = parseRawJobDescription('');
    expect(result.company).toBe('Target Company');
    expect(result.title).toBe('Target Role');
    expect(result.description).toBe('');
    expect(result.requirements).toEqual([]);
    expect(result.responsibilities).toEqual([]);
  });

  // Sample 12: Complex prompt generation test
  it('Sample 12: generates high-quality tailored prompt with extracted tech keywords', () => {
    const jd12 = `
Senior Fullstack Developer (React & Golang)
Company: Sea Group

Requirements:
- Experience in React, TypeScript, Golang, PostgreSQL, Docker, AWS.
    `;

    const result = parseRawJobDescription(jd12);
    expect(result.title).toBe('Senior Fullstack Developer (React & Golang)');
    expect(result.company).toBe('Sea Group');
    expect(result.experienceLevel).toBe('senior');
    expect(result.suggestedCustomPrompt).toContain('Sea Group');
    expect(result.suggestedCustomPrompt).toContain('React');
    expect(result.suggestedCustomPrompt).toContain('Golang');
    expect(result.suggestedCustomPrompt).toContain('system architecture');
  });

  // Sample 13: Lazy copy-paste from Indeed/portal (the exact user real-world case)
  it('Sample 13: parses raw lazy portal copy-paste (MiTek Engineering Fresher sample)', () => {
    const rawPortalDump = `
Nhân Viên Thiết Kế Kỹ Thuật (Không Yêu Cầu Kinh Nghiệm, Được Đào Tạo)
MiTek Vietnam Co., LTD
•
Thành phố Hồ Chí Minh
•
11,000,000 VNĐ - 13,000,000 VNĐ a month
Apply now
Job details
Here’s how the job details align with your profile.
Pay
11,000,000 VNĐ - 13,000,000 VNĐ a month
Job type
Cố định
Toàn thời gian
Full job description

MiTek Việt Nam đang tuyển dụng Nhân viên Thiết kế Kỹ thuật (Fresher) tham gia các dự án xây dựng quốc tế.

Đây là cơ hội dành cho sinh viên mới tốt nghiệp các ngành kỹ thuật mong muốn phát triển nghề nghiệp trong môi trường chuyên nghiệp, ổn định và quốc tế. Bạn sẽ được đào tạo bài bản và tham gia các dự án xây dựng tại Mỹ, Úc, New Zealand, Anh và Châu Âu.

Trách nhiệm công việc

    Sử dụng phần mềm thiết kế chuyên dụng để triển khai bản vẽ kỹ thuật cho các dự án xây dựng.
    Đọc hiểu và phân tích bản vẽ kiến trúc, bản vẽ kỹ thuật và các tài liệu liên quan.
    Hỗ trợ thiết kế, mô hình hóa và phát triển các cấu kiện công trình theo yêu cầu dự án.
    Phối hợp với các thành viên trong nhóm để đảm bảo chất lượng và tiến độ công việc.
    Tham gia các chương trình đào tạo chuyên môn phục vụ công việc.
    Tuân thủ các quy trình, tiêu chuẩn kỹ thuật và yêu cầu chất lượng.
    Thực hiện các công việc khác theo phân công của quản lý.

Yêu cầu ứng viên

    Không yêu cầu kinh nghiệm và được đào tạo từ đầu 100%
    Sinh viên mới tốt nghiệp hoặc đang chờ lấy bằng Cao đẳng/Đại học các ngành: Xây dựng, Kỹ thuật xây dựng, Kiến trúc, Cơ khí, Điện – Điện tử, Môi trường, Hóa học hoặc các ngành kỹ thuật liên quan
    Có tư duy kỹ thuật và khả năng phân tích thông tin tốt.
    Có khả năng hình dung không gian, đọc hiểu hình chiếu và bản vẽ kỹ thuật cơ bản.
    Cẩn thận, tỉ mỉ và có tinh thần trách nhiệm trong công việc.
    Chủ động học hỏi và mong muốn phát triển lâu dài trong lĩnh vực thiết kế kỹ thuật.
    Có khả năng làm việc nhóm và giao tiếp tốt

Cơ hội phát triển

    Chương trình đào tạo bài bản dành cho nhân viên mới, được hướng dẫn bởi đội ngũ kỹ sư giàu kinh nghiệm trong nước và quốc tế.
    Lộ trình nghề nghiệp rõ ràng: Nhân viên → Trưởng nhóm → Quản lý Nhóm → Quản lý Bộ phận

Quyền lợi ứng viên

Thu nhập & Thưởng

    Thu nhập từ: 11.000.000 đến 13.000.000
    Lương tháng 13.
    Thưởng hiệu suất hàng năm.

Chăm sóc sức khỏe toàn diện

    Bảo hiểm PVI dành cho nhân viên.
    BHXH, BHYT, BHTN đầy đủ theo quy định nhà nước.
    Bảo hiểm tai nạn 24/7.
    Khám sức khỏe định kỳ hàng năm.

Nghỉ phép & Cân bằng cuộc sống

    12 ngày phép năm + 1 ngày nghỉ Giáng sinh.
    Nghỉ lễ, Tết theo quy định nhà nước.

Ghi nhận & Vinh danh

    Chương trình Nhân viên Xuất sắc tháng/năm.
    Giải thưởng Platinum Star dành cho các cá nhân có thành tích nổi bật.
    Chuyến du lịch VIP dành cho nhân viên gắn bó từ 3 năm trở lên.

Môi trường làm việc

    Văn phòng hiện đại cùng trang thiết bị làm việc đầy đủ.
    Khu thể thao nội khu với sân bóng đá, bóng rổ, pickleball, phòng gym, yoga và nhảy.

Hoạt động & Phúc lợi khác

    Bữa trưa miễn phí hằng ngày.
    Team building và các hoạt động nội bộ.
    Phúc lợi từ Công đoàn và Social Club: quà tặng dịp lễ, sinh nhật, kết hôn, thăm hỏi và các chương trình gắn kết nhân viên

Mục lương: 11.000.000₫ - 13.000.000₫ một tháng

Địa điểm việc làm: Làm việc trực tiếp
    `;

    const result = parseRawJobDescription(rawPortalDump);
    expect(result.title).toBe('Nhân Viên Thiết Kế Kỹ Thuật (Không Yêu Cầu Kinh Nghiệm, Được Đào Tạo)');
    expect(result.company).toBe('MiTek Vietnam Co., LTD');
    expect(result.experienceLevel).toBe('fresher');
    expect(result.responsibilities.length).toBe(7);
    expect(result.requirements.length).toBe(7);
    expect(result.suggestedCustomPrompt).toContain('MiTek Vietnam Co., LTD');
    expect(result.suggestedCustomPrompt).toContain('Nhân Viên Thiết Kế Kỹ Thuật');
    // Verify metadata extraction
    expect(result.salary).toContain('13.000.000');
    expect(result.location).toBe('Làm việc trực tiếp');
    expect(result.employmentType).toBe('Toàn thời gian');
    expect(result.benefits?.length).toBeGreaterThan(0);
    expect(result.careerGrowth?.length).toBeGreaterThan(0);
    // Verify boilerplate like "Apply now" / "Job details" are cleaned from overview
    expect(result.description).not.toContain('Apply now');
    expect(result.description).not.toContain('Here’s how the job details align with your profile');
    expect(result.description).toContain('MiTek Việt Nam đang tuyển dụng');
  });

  // Sample 14: Civil Engineering / BIM Engineer (VietnamWorks format with UI noise)
  it('Sample 14: correctly parses Civil / BIM Engineer JD with VietnamWorks UI buttons', () => {
    const jd14 = `
Kỹ Sư Kết Cấu Xây Dựng (BIM / Revit)
Coteccons Construction JSC
•
Ứng tuyển ngay
Lưu công việc
Mức lương: 18.000.000 - 25.000.000 VNĐ
Nơi làm việc: TP.HCM
Hạn nộp hồ sơ: 30/10/2026

Mô tả công việc:
- Thiết kế kết cấu bê tông cốt thép và kết cấu thép cho các công trình cao tầng.
- Mô hình hóa công trình 3D sử dụng phần mềm Revit và Tekla.
- Phối hợp với bộ phận kiến trúc và MEP để xử lý xung đột mô hình BIM.
- Lập bảng tính toán kết cấu và bảo vệ phương án trước chủ đầu tư.

Yêu cầu công việc:
- Tốt nghiệp Đại học chuyên ngành Xây dựng Dân dụng & Công nghiệp.
- Có từ 3 năm kinh nghiệm thiết kế kết cấu tại các công ty tư vấn thiết kế lớn.
- Thành thạo các phần mềm: AutoCAD, Revit, Tekla, SAP2000, ETABS.
- Có chứng chỉ hành nghề thiết kế kết cấu là lợi thế.

Quyền lợi:
- Lương tháng 13 và thưởng dự án hấp dẫn.
- Bảo hiểm sức khỏe Bảo Việt cao cấp cho nhân viên và người thân.
- Phụ cấp ăn trưa và công tác phí đầy đủ.
    `;

    const result = parseRawJobDescription(jd14);
    expect(result.title).toBe('Kỹ Sư Kết Cấu Xây Dựng (BIM / Revit)');
    expect(result.company).toBe('Coteccons Construction JSC');
    expect(result.experienceLevel).toBe('mid');
    expect(result.responsibilities.length).toBe(4);
    expect(result.requirements.length).toBe(4);
    expect(result.detectedSkills).toContain('Revit');
    expect(result.detectedSkills).toContain('BIM');
    expect(result.detectedSkills).toContain('AutoCAD');
    expect(result.description).not.toContain('Ứng tuyển ngay');
    expect(result.description).not.toContain('Lưu công việc');
  });

  // Sample 15: Mechanical Design Engineer (Indeed format)
  it('Sample 15: correctly parses Mechanical Design Engineer JD with Indeed UI buttons', () => {
    const jd15 = `
Kỹ Sư Thiết Kế Cơ Khí (SolidWorks / Inventor)
VinFast Auto Ltd.
•
Hải Phòng
•
30,000,000 VNĐ - 45,000,000 VNĐ a month
Apply now
Job details
Pay
30,000,000 VNĐ - 45,000,000 VNĐ a month
Job type
Toàn thời gian
Cố định

Mô tả chi tiết:
- Thiết kế chi tiết cơ khí và cụm cụm linh kiện cho dây chuyền sản xuất ô tô điện.
- Mô phỏng ứng suất động lực học và độ bền cấu kiện trên SolidWorks và ANSYS.
- Xuất bản vẽ 2D kỹ thuật phục vụ gia công CNC và lắp ráp.
- Phối hợp cùng xưởng sản xuất để tối ưu hóa quy trình chế tạo mẫu thử.

Tiêu chuẩn ứng viên:
- Tốt nghiệp Đại học chuyên ngành Kỹ thuật Cơ khí, Chế tạo máy, Cơ điện tử.
- 5+ năm kinh nghiệm thiết kế cơ khí chính xác hoặc ngành ô tô.
- Sử dụng thành thạo SolidWorks, Inventor và AutoCAD.
- Có khả năng đọc hiểu tài liệu kỹ thuật tiếng Anh tốt.

Chế độ đãi ngộ:
- Thu nhập hấp dẫn lên đến 45 triệu/tháng cùng gói cổ phiếu ưu đãi.
- Xe đưa đón Hà Nội - Hải Phòng hàng ngày và căn hộ lưu trú miễn phí.
    `;

    const result = parseRawJobDescription(jd15);
    expect(result.title).toBe('Kỹ Sư Thiết Kế Cơ Khí (SolidWorks / Inventor)');
    expect(result.company).toBe('VinFast Auto Ltd.');
    expect(result.experienceLevel).toBe('senior');
    expect(result.responsibilities.length).toBe(4);
    expect(result.requirements.length).toBe(4);
    expect(result.detectedSkills).toContain('SolidWorks');
    expect(result.detectedSkills).toContain('AutoCAD');
    expect(result.suggestedCustomPrompt).toContain('VinFast Auto Ltd.');
  });

  // Sample 16: General Accountant (TopCV format)
  it('Sample 16: correctly parses General Accountant JD with TopCV artifacts', () => {
    const jd16 = `
Nhân Viên Kế Toán Tổng Hợp
Tập đoàn Sunhouse
Nộp đơn ứng tuyển
Lưu công việc
Mục lương: 14.000.000₫ - 18.000.000₫ một tháng
Địa điểm làm việc: Hà Nội

Mô tả công việc:
1. Kiểm tra, đối chiếu số liệu giữa các đơn vị nội bộ, dữ liệu chi tiết và tổng hợp.
2. Kiểm tra các định khoản các nghiệp vụ phát sinh và hạch toán trên phần mềm kế toán MISA / FAST.
3. Lập Báo cáo tài chính, Báo cáo thuế (VAT, TNCN, TNDN) định kỳ tháng/quý/năm.
4. Tham gia công tác kiểm kê tài sản định kỳ và phối hợp với kiểm toán độc lập.

Yêu cầu ứng viên:
1. Tốt nghiệp Cao đẳng/Đại học chuyên ngành Kế toán, Kiểm toán, Tài chính doanh nghiệp.
2. Có từ 2 đến 4 năm kinh nghiệm làm việc ở vị trí Kế toán tổng hợp.
3. Sử dụng thành thạo phần mềm kế toán MISA, FAST và Excel nâng cao.
4. Cẩn thận, trung thực, có tinh thần trách nhiệm cao.

Phúc lợi:
- Mức lương cạnh tranh theo năng lực từ 14 - 18 triệu đồng.
- Thưởng các dịp Lễ, Tết, lương tháng thứ 13 và thưởng hiệu quả kinh doanh.
    `;

    const result = parseRawJobDescription(jd16);
    expect(result.title).toBe('Nhân Viên Kế Toán Tổng Hợp');
    expect(result.company).toBe('Tập đoàn Sunhouse');
    expect(result.experienceLevel).toBe('mid');
    expect(result.responsibilities.length).toBe(4);
    expect(result.requirements.length).toBe(4);
    expect(result.detectedSkills).toContain('MISA');
    expect(result.detectedSkills).toContain('FAST');
    expect(result.detectedSkills).toContain('Thuế');
    expect(result.detectedSkills).toContain('Báo cáo tài chính');
  });

  // Sample 17: Talent Acquisition Specialist (HR role)
  it('Sample 17: correctly parses Talent Acquisition HR JD', () => {
    const jd17 = `
Chuyên Viên Tuyển Dụng & Thu Hút Nhân Tài
VNG Corporation
Easy Apply
Save job

Trách nhiệm công việc:
- Tiếp nhận nhu cầu tuyển dụng từ các khối kinh doanh và xây dựng kế hoạch tuyển dụng chi tiết.
- Chủ động tìm kiếm ứng viên tiềm năng (Talent Acquisition) qua các kênh LinkedIn, TopCV, VietnamWorks, GitHub.
- Phỏng vấn sàng lọc sơ bộ ứng viên và điều phối lịch phỏng vấn chuyên môn với Hiring Manager.
- Đảm bảo trải nghiệm ứng viên tốt nhất và hoàn thành chỉ tiêu KPI tuyển dụng đề ra.

Yêu cầu:
- Tốt nghiệp Đại học chuyên ngành Quản trị Nhân sự, Kinh tế, Ngoại ngữ hoặc ngành liên quan.
- Có 1 - 2 năm kinh nghiệm trong lĩnh vực Tuyển dụng (đặc biệt là Tech Recruiting).
- Kỹ năng giao tiếp, thuyết phục và mở rộng mạng lưới networking tốt.
- Năng động, chịu được áp lực cao và có tư duy hướng tới kết quả.

Quyền lợi ứng viên:
- Thu nhập hấp dẫn cùng các khoản thưởng KPI tuyển dụng hàng quý.
- Trải nghiệm văn phòng Campus chuẩn quốc tế với phòng gym, hồ bơi, cafeteria miễn phí.
    `;

    const result = parseRawJobDescription(jd17);
    expect(result.title).toBe('Chuyên Viên Tuyển Dụng & Thu Hút Nhân Tài');
    expect(result.company).toBe('VNG Corporation');
    expect(result.experienceLevel).toBe('junior');
    expect(result.responsibilities.length).toBe(4);
    expect(result.requirements.length).toBe(4);
    expect(result.detectedSkills).toContain('Talent Acquisition');
    expect(result.detectedSkills).toContain('Tuyển dụng');
    expect(result.detectedSkills).toContain('KPI');
  });

  // Sample 18: Digital Marketing Executive
  it('Sample 18: correctly parses Digital Marketing Executive JD', () => {
    const jd18 = `
Vị trí: Digital Marketing Executive (SEO & Google Ads)
Doanh nghiệp: Nova Digital Agency

Nhiệm vụ chính:
• Lập kế hoạch và triển khai các chiến dịch quảng cáo Google Ads (Search, Display, Shopping) và Facebook Ads.
• Tối ưu hóa SEO On-page và Off-page cho website để tăng trưởng traffic tự nhiên.
• Phân tích hiệu quả chiến dịch qua Google Analytics và đề xuất giải pháp tối ưu CPA/ROAS.
• Phối hợp với Content team để phát triển nội dung quảng cáo sáng tạo và hấp dẫn.

Kỹ năng cần có:
• Tối thiểu 2+ năm kinh nghiệm chạy quảng cáo Google Ads và triển khai dự án SEO thực tế.
• Thành thạo Google Analytics, Google Tag Manager, Ahrefs, SEMrush.
• Có khả năng đọc số liệu, phân tích chỉ số và báo cáo hiệu quả định kỳ.
• Sáng tạo, nhạy bén với xu hướng thị trường số.
    `;

    const result = parseRawJobDescription(jd18);
    expect(result.title).toBe('Digital Marketing Executive (SEO & Google Ads)');
    expect(result.company).toBe('Nova Digital Agency');
    expect(result.experienceLevel).toBe('mid');
    expect(result.responsibilities.length).toBe(4);
    expect(result.requirements.length).toBe(4);
    expect(result.detectedSkills).toContain('SEO');
    expect(result.detectedSkills).toContain('Google Ads');
    expect(result.detectedSkills).toContain('Facebook Ads');
  });

  // Sample 19: Engineering Manager / Leadership Role
  it('Sample 19: correctly parses Engineering Manager JD', () => {
    const jd19 = `
Job Title: Engineering Manager
Company: Axon Active Vietnam

Key Responsibilities:
- Lead and manage multiple Agile software engineering squads delivering enterprise solutions.
- Drive technical roadmap, system design architecture, and engineering excellence standards.
- Mentor tech leads and engineers, conduct regular 1-on-1s, and foster professional career growth.
- Align engineering deliverables with company strategic goals and business OKRs.

Qualifications:
- 8+ years of software development experience with at least 3+ years in an engineering leadership or manager role.
- Strong background in distributed systems, Microservices, Cloud (AWS/Azure), and CI/CD pipelines.
- Proven expertise in Scrum and Agile methodologies.
- Outstanding leadership, English communication, and conflict resolution skills.
    `;

    const result = parseRawJobDescription(jd19);
    expect(result.title).toBe('Engineering Manager');
    expect(result.company).toBe('Axon Active Vietnam');
    expect(result.experienceLevel).toBe('manager');
    expect(result.responsibilities.length).toBe(4);
    expect(result.requirements.length).toBe(4);
    expect(result.suggestedCustomPrompt).toContain('mentorship');
    expect(result.suggestedCustomPrompt).toContain('Axon Active Vietnam');
  });

  // Sample 20: Accounting Intern
  it('Sample 20: correctly parses Accounting Intern JD (Zero experience required)', () => {
    const jd20 = `
Thực Tập Sinh Kế Toán (Accounting Intern)
KPMG Vietnam
Toàn thời gian

Mô tả công việc:
- Hỗ trợ kế toán viên kiểm tra hóa đơn chứng từ và nhập liệu vào hệ thống kế toán.
- Sắp xếp và lưu trữ hồ sơ chứng từ kế toán, hồ sơ khai thuế khoa học.
- Hỗ trợ chuẩn bị hồ sơ kiểm toán và báo cáo tổng hợp số liệu theo yêu cầu.

Yêu cầu ứng viên:
- Sinh viên năm cuối hoặc mới tốt nghiệp Đại học chuyên ngành Kế toán - Kiểm toán, Tài chính.
- Không yêu cầu kinh nghiệm, được đào tạo chi tiết các quy trình nghiệp vụ thực tế.
- Sử dụng tốt vi tính văn phòng (Word, Excel) và tiếng Anh giao tiếp cơ bản.
- Chăm chỉ, tỉ mỉ, có trách nhiệm và mong muốn phát triển nghề nghiệp lâu dài.

Quyền lợi:
- Được hỗ trợ phụ cấp thực tập hàng tháng và dấu mộc thực tập tốt nghiệp.
- Cơ hội được tuyển dụng chính thức sau kỳ thực tập nếu đạt kết quả tốt.
    `;

    const result = parseRawJobDescription(jd20);
    expect(result.title).toBe('Thực Tập Sinh Kế Toán (Accounting Intern)');
    expect(result.company).toBe('KPMG Vietnam');
    expect(result.experienceLevel).toBe('intern');
    expect(result.responsibilities.length).toBe(3);
    expect(result.requirements.length).toBe(4);
    expect(result.suggestedCustomPrompt).toContain('academic foundation');
  });
});

