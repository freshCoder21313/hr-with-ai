import { describe, it, expect } from 'vitest';
import {
  extractProposedChanges,
  extractValidatedProposedChanges,
  cleanChatResponse,
} from './cvChatUtils';

describe('cvChatUtils', () => {
  describe('extractProposedChanges', () => {
    it('should extract valid changes', () => {
      const text =
        '```json\n{\n  "proposedChanges": [\n    {\n      "section": "basics",\n      "action": "update",\n      "newData": { "name": "John Doe" },\n      "explanation": "Update name"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].section).toBe('basics');
      expect(result![0].newData).toEqual({ name: 'John Doe' });
    });

    it('should reject unknown section', () => {
      const text =
        '```json\n{\n  "proposedChanges": [\n    {\n      "section": "unknown_section",\n      "action": "update",\n      "newData": { "foo": "bar" },\n      "explanation": "Invalid section"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).toBeNull();
    });

    it('should reject invalid action', () => {
      const text =
        '```json\n{\n  "proposedChanges": [\n    {\n      "section": "basics",\n      "action": "invalid_action",\n      "newData": { "name": "John Doe" },\n      "explanation": "Invalid action"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).toBeNull();
    });

    it('should reject missing explanation', () => {
      const text =
        '```json\n{\n  "proposedChanges": [\n    {\n      "section": "basics",\n      "action": "update",\n      "newData": { "name": "John Doe" }\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text as any);
      expect(result).toBeNull();
    });

    it('should reject primitive basics', () => {
      const text =
        '```json\n{\n  "proposedChanges": [\n    {\n      "section": "basics",\n      "action": "update",\n      "newData": "Just a string",\n      "explanation": "Invalid basics"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).toBeNull();
    });

    it('should reject work entry missing required fields', () => {
      const text =
        '```json\n{\n  "proposedChanges": [\n    {\n      "section": "work",\n      "action": "add",\n      "newData": [{ "summary": "Missing name and position" }],\n      "explanation": "Invalid work entry"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).toBeNull();
    });

    it('should extract valid work entry', () => {
      const text =
        '```json\n{\n  "proposedChanges": [\n    {\n      "section": "work",\n      "action": "add",\n      "newData": [{ "name": "Company", "position": "Dev" }],\n      "explanation": "Valid work entry"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).toHaveLength(1);
    });

    it('should handle mixed response: one valid and one invalid', () => {
      const text =
        '```json\n{\n  "proposedChanges": [\n    {\n      "section": "basics",\n      "action": "update",\n      "newData": { "name": "John Doe" },\n      "explanation": "Valid"\n    },\n    {\n      "section": "work",\n      "action": "add",\n      "newData": [{ "summary": "Invalid" }],\n      "explanation": "Invalid"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).toHaveLength(1);
      expect(result![0].section).toBe('basics');
    });

    it('should extract valid array work rewrite', () => {
      const text =
        '```json\n{\n  "proposedChanges": [\n    {\n      "section": "work",\n      "action": "rewrite",\n      "newData": [\n        { "name": "Company A", "position": "Senior Dev" },\n        { "name": "Company B", "position": "Junior Dev" }\n      ],\n      "explanation": "Rewrite entire work history"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(Array.isArray(result![0].newData)).toBe(true);
      expect(result![0].newData).toHaveLength(2);
    });

    it('should extract valid skills array', () => {
      const text =
        '```json\n{\n  "proposedChanges": [\n    {\n      "section": "skills",\n      "action": "update",\n      "newData": [\n        { "name": "TypeScript", "level": "Master" },\n        { "name": "React", "level": "Expert" }\n      ],\n      "explanation": "Update skills list"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(Array.isArray(result![0].newData)).toBe(true);
    });
  });

  describe('extractValidatedProposedChanges', () => {
    it('should report invalid count for malformed array entry', () => {
      const text =
        '```json\n{\n  "proposedChanges": [\n    {\n      "section": "work",\n      "action": "rewrite",\n      "newData": [\n        { "name": "Valid Co", "position": "Dev" },\n        { "name": "Invalid Co" }\n      ],\n      "explanation": "One valid, one missing position"\n    }\n  ]\n}\n```';
      const result = extractValidatedProposedChanges(text);
      expect(result.changes).toHaveLength(0);
      expect(result.invalidCount).toBe(1);
    });

    it('should report invalid count', () => {
      const text =
        '```json\n{\n  "proposedChanges": [\n    {\n      "section": "basics",\n      "action": "update",\n      "newData": { "name": "John Doe" },\n      "explanation": "Valid"\n    },\n    {\n      "section": "work",\n      "action": "add",\n      "newData": [{ "summary": "Invalid" }],\n      "explanation": "Invalid"\n    },\n    {\n      "section": "unknown",\n      "action": "update",\n      "newData": {},\n      "explanation": "Unknown section"\n    }\n  ]\n}\n```';
      const result = extractValidatedProposedChanges(text);
      expect(result.changes).toHaveLength(1);
      expect(result.invalidCount).toBe(2);
    });
  });

  describe('change id assignment', () => {
    const basics = (id?: string) =>
      `{"section":"basics","action":"update","newData":{"name":"John Doe"},"explanation":"ok"${
        id === undefined ? '' : `,"id":${JSON.stringify(id)}`
      }}`;
    const meta = (id?: string) =>
      `{"section":"meta","action":"update","newData":{},"explanation":"ok"${
        id === undefined ? '' : `,"id":${JSON.stringify(id)}`
      }}`;
    const wrap = (entries: string) => `\`\`\`json\n{"proposedChanges":[${entries}]}\n\`\`\``;

    it('replaces an empty or missing id with a non-empty generated one', () => {
      const { changes, invalidCount } = extractValidatedProposedChanges(
        wrap(`${basics('')},${meta()}`)
      );

      expect(invalidCount).toBe(0);
      expect(changes).toHaveLength(2);
      expect(changes[0].id).not.toBe('');
      expect(changes[1].id).not.toBe('');
    });

    it('keeps generated ids unique within a batch', () => {
      const { changes } = extractValidatedProposedChanges(
        wrap(`${basics('')},${meta('')},${basics('')}`)
      );

      expect(changes).toHaveLength(3);
      const seen = new Set<string>();
      for (const change of changes) seen.add(change.id);
      expect(seen.size).toBe(changes.length);
    });

    it('does not collide with an AI-supplied id equal to the generated one', () => {
      const { changes } = extractValidatedProposedChanges(
        wrap(`${basics('')},${meta(`change-${Date.now()}-1`)}`)
      );

      expect(changes).toHaveLength(2);
      expect(changes[0].id).not.toBe(changes[1].id);
    });
  });

  describe('interactiveQuestion extraction', () => {
    it('should extract a valid radio question from interactiveQuestion envelope', () => {
      const text = `
Here is a question:
\`\`\`json
{
  "interactiveQuestion": {
    "id": "q_scale",
    "type": "radio",
    "question": "What was the scale of your system?",
    "description": "Helps quantify your achievements",
    "options": [
      { "id": "opt_1", "label": "< 10k users" },
      { "id": "opt_2", "label": "10k - 100k users", "description": "Medium scale" },
      { "id": "opt_3", "label": "100k+ users", "description": "High scale" }
    ],
    "allowCustomInput": true,
    "inputPlaceholder": "Or specify custom number...",
    "submitLabel": "Save & Continue"
  }
}
\`\`\`
      `;
      const result = extractValidatedProposedChanges(text);
      expect(result.interactiveQuestion).not.toBeNull();
      expect(result.interactiveQuestion?.id).toBe('q_scale');
      expect(result.interactiveQuestion?.type).toBe('radio');
      expect(result.interactiveQuestion?.options).toHaveLength(3);
      expect(result.interactiveQuestion?.allowCustomInput).toBe(true);
    });

    it('should extract a valid checkbox question with min/max selection', () => {
      const text = `
\`\`\`json
{
  "interactiveQuestion": {
    "id": "q_skills",
    "type": "checkbox",
    "question": "Which of these JD skills do you have experience with?",
    "options": [
      { "id": "react", "label": "React.js" },
      { "id": "ts", "label": "TypeScript" },
      { "id": "graphql", "label": "GraphQL" }
    ],
    "minSelect": 1,
    "maxSelect": 2
  }
}
\`\`\`
      `;
      const result = extractValidatedProposedChanges(text);
      expect(result.interactiveQuestion).not.toBeNull();
      expect(result.interactiveQuestion?.type).toBe('checkbox');
      expect(result.interactiveQuestion?.minSelect).toBe(1);
      expect(result.interactiveQuestion?.maxSelect).toBe(2);
    });

    it('should extract pure input question', () => {
      const text = `
\`\`\`json
{
  "interactiveQuestion": {
    "id": "q_metric",
    "type": "input",
    "question": "What was the percentage increase in page speed?",
    "inputPlaceholder": "e.g. 40%"
  }
}
\`\`\`
      `;
      const result = extractValidatedProposedChanges(text);
      expect(result.interactiveQuestion).not.toBeNull();
      expect(result.interactiveQuestion?.type).toBe('input');
      expect(result.interactiveQuestion?.inputPlaceholder).toBe('e.g. 40%');
    });

    it('should extract question from root-level json object', () => {
      const text = `
\`\`\`json
{
  "id": "q_tone",
  "type": "combo",
  "question": "Choose a tone for the summary",
  "options": [
    { "id": "impact", "label": "Impact-driven" },
    { "id": "technical", "label": "Technical" }
  ]
}
\`\`\`
      `;
      const result = extractValidatedProposedChanges(text);
      expect(result.interactiveQuestion).not.toBeNull();
      expect(result.interactiveQuestion?.id).toBe('q_tone');
      expect(result.interactiveQuestion?.type).toBe('combo');
    });

    it('should extract BOTH proposed changes AND interactive question from combined block', () => {
      const text = `
\`\`\`json
{
  "proposedChanges": [
    {
      "section": "basics",
      "action": "update",
      "newData": { "name": "Jane Doe" },
      "explanation": "Updated name"
    }
  ],
  "interactiveQuestion": {
    "id": "q_next",
    "type": "radio",
    "question": "What should we work on next?",
    "options": [
      { "id": "work", "label": "Work Experience" },
      { "id": "skills", "label": "Skills" }
    ]
  }
}
\`\`\`
      `;
      const result = extractValidatedProposedChanges(text);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].section).toBe('basics');
      expect(result.interactiveQuestion).not.toBeNull();
      expect(result.interactiveQuestion?.id).toBe('q_next');
    });

    it('should repair slightly malformed json containing interactiveQuestion', () => {
      const text = `
\`\`\`json
{
  "interactiveQuestion": {
    "id": "q_repair",
    "type": "radio",
    "question": "Repaired question",
    "options": [
      { "id": "opt_1", "label": "Option 1" }
    ],
\`\`\`
      `;
      const result = extractValidatedProposedChanges(text);
      expect(result.interactiveQuestion).not.toBeNull();
      expect(result.interactiveQuestion?.id).toBe('q_repair');
    });

    it('should extract interactiveQuestionGroup envelope with multiple questions', () => {
      const text = `
\`\`\`json
{
  "interactiveQuestionGroup": {
    "id": "group_proj",
    "title": "Project Details",
    "description": "Provide info on your latest project",
    "questions": [
      {
        "id": "q1",
        "type": "radio",
        "question": "What was the team size?",
        "options": [{ "id": "opt1", "label": "1-5" }, { "id": "opt2", "label": "5+" }]
      },
      {
        "id": "q2",
        "type": "input",
        "question": "Key metrics achieved?",
        "inputPlaceholder": "e.g. +30% speed"
      }
    ],
    "submitLabel": "Submit Project Info"
  }
}
\`\`\`
      `;
      const result = extractValidatedProposedChanges(text);
      expect(result.interactiveQuestionGroup).not.toBeNull();
      expect(result.interactiveQuestionGroup?.id).toBe('group_proj');
      expect(result.interactiveQuestionGroup?.title).toBe('Project Details');
      expect(result.interactiveQuestionGroup?.description).toBe(
        'Provide info on your latest project'
      );
      expect(result.interactiveQuestionGroup?.questions).toHaveLength(2);
      expect(result.interactiveQuestionGroup?.questions[0].id).toBe('q1');
      expect(result.interactiveQuestionGroup?.questions[1].id).toBe('q2');
      expect(result.interactiveQuestionGroup?.submitLabel).toBe('Submit Project Info');
      expect(result.interactiveQuestion?.id).toBe('q1');
    });

    it('should extract interactiveQuestions array envelope and normalize into a group', () => {
      const text = `
\`\`\`json
{
  "interactiveQuestions": [
    {
      "id": "q_role",
      "type": "radio",
      "question": "Select your role",
      "options": [{ "id": "fe", "label": "Frontend" }, { "id": "be", "label": "Backend" }]
    },
    {
      "id": "q_skills",
      "type": "checkbox",
      "question": "Select skills",
      "options": [{ "id": "r", "label": "React" }, { "id": "n", "label": "Node" }]
    }
  ]
}
\`\`\`
      `;
      const result = extractValidatedProposedChanges(text);
      expect(result.interactiveQuestionGroup).not.toBeNull();
      expect(result.interactiveQuestionGroup?.questions).toHaveLength(2);
      expect(result.interactiveQuestionGroup?.questions[0].id).toBe('q_role');
      expect(result.interactiveQuestionGroup?.questions[1].id).toBe('q_skills');
    });

    it('should extract root-level object with questions array and normalize into a group', () => {
      const text = `
\`\`\`json
{
  "id": "group_root",
  "title": "Onboarding Survey",
  "questions": [
    {
      "id": "q_level",
      "type": "radio",
      "question": "What is your seniority?",
      "options": [{ "id": "jr", "label": "Junior" }, { "id": "sr", "label": "Senior" }]
    }
  ]
}
\`\`\`
      `;
      const result = extractValidatedProposedChanges(text);
      expect(result.interactiveQuestionGroup).not.toBeNull();
      expect(result.interactiveQuestionGroup?.id).toBe('group_root');
      expect(result.interactiveQuestionGroup?.title).toBe('Onboarding Survey');
      expect(result.interactiveQuestionGroup?.questions).toHaveLength(1);
    });

    it('should filter out invalid items from interactiveQuestions array and keep valid ones', () => {
      const text = `
\`\`\`json
{
  "interactiveQuestions": [
    {
      "id": "q_valid",
      "type": "input",
      "question": "Valid question"
    },
    {
      "id": "q_invalid",
      "type": "unknown_type",
      "question": 123
    }
  ]
}
\`\`\`
      `;
      const result = extractValidatedProposedChanges(text);
      expect(result.interactiveQuestionGroup).not.toBeNull();
      expect(result.interactiveQuestionGroup?.questions).toHaveLength(1);
      expect(result.interactiveQuestionGroup?.questions[0].id).toBe('q_valid');
    });
  });

  describe('raw/unfenced JSON extraction (no markdown code fences)', () => {
    it('should extract interactiveQuestion when AI returns raw JSON without ``` (user screenshot case)', () => {
      const text = `Để giúp bạn tự tin hơn khi ứng tuyển vào vị trí này, tôi có một câu hỏi nhỏ để làm rõ kinh nghiệm của bạn:
{
  "interactiveQuestion": {
    "id": "q_react_exp",
    "type": "radio",
    "question": "Bạn đã có bao nhiêu năm kinh nghiệm với React và TypeScript?",
    "description": "Giúp lượng hóa kinh nghiệm thực tế trên CV",
    "options": [
      { "id": "opt_1", "label": "Dưới 1 năm" },
      { "id": "opt_2", "label": "1 - 3 năm", "description": "Mức độ trung cấp" },
      { "id": "opt_3", "label": "Trên 3 năm", "description": "Senior" }
    ],
    "allowCustomInput": true,
    "inputPlaceholder": "Hoặc ghi số năm cụ thể...",
    "submitLabel": "Xác nhận & Tiếp tục"
  }
}`;
      const result = extractValidatedProposedChanges(text);
      expect(result.interactiveQuestion).not.toBeNull();
      expect(result.interactiveQuestion?.id).toBe('q_react_exp');
      expect(result.interactiveQuestion?.type).toBe('radio');
      expect(result.interactiveQuestion?.options).toHaveLength(3);
      expect(result.interactiveQuestion?.submitLabel).toBe('Xác nhận & Tiếp tục');

      expect(result.cleanedText).toBe(
        'Để giúp bạn tự tin hơn khi ứng tuyển vào vị trí này, tôi có một câu hỏi nhỏ để làm rõ kinh nghiệm của bạn:'
      );
    });

    it('should extract raw unfenced proposedChanges and clean surrounding text', () => {
      const text = `Tôi đã phân tích CV của bạn và chuẩn bị cập nhật:
{
  "proposedChanges": [
    {
      "section": "basics",
      "action": "update",
      "newData": { "name": "Nguyễn Văn A" },
      "explanation": "Cập nhật họ tên chuẩn"
    }
  ]
}
Vui lòng xem lại thay đổi ở trên.`;

      const result = extractValidatedProposedChanges(text);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].section).toBe('basics');
      expect(result.changes[0].newData).toEqual({ name: 'Nguyễn Văn A' });

      expect(result.cleanedText).toBe(
        'Tôi đã phân tích CV của bạn và chuẩn bị cập nhật:\n\nVui lòng xem lại thay đổi ở trên.'
      );
    });

    it('should extract raw unfenced interactiveQuestionGroup with multiple questions', () => {
      const text = `Vui lòng cung cấp thêm thông tin dự án:
{
  "interactiveQuestionGroup": {
    "id": "grp_proj",
    "title": "Chi tiết dự án",
    "questions": [
      { "id": "q1", "type": "input", "question": "Quy mô team?" },
      { "id": "q2", "type": "radio", "question": "Vai trò chính?", "options": [{ "id": "lead", "label": "Tech Lead" }] }
    ],
    "submitLabel": "Gửi thông tin"
  }
}`;

      const result = extractValidatedProposedChanges(text);
      expect(result.interactiveQuestionGroup).not.toBeNull();
      expect(result.interactiveQuestionGroup?.id).toBe('grp_proj');
      expect(result.interactiveQuestionGroup?.questions).toHaveLength(2);
      expect(result.interactiveQuestionGroup?.submitLabel).toBe('Gửi thông tin');
      expect(result.cleanedText).toBe('Vui lòng cung cấp thêm thông tin dự án:');
    });

    it('should extract both proposedChanges and interactiveQuestion in raw JSON', () => {
      const text = `Đã cập nhật mục kĩ năng.
{
  "proposedChanges": [
    {
      "section": "skills",
      "action": "update",
      "newData": [{ "name": "React" }],
      "explanation": "Thêm React"
    }
  ],
  "interactiveQuestion": {
    "id": "q_next",
    "type": "radio",
    "question": "Bạn muốn làm gì tiếp theo?",
    "options": [{ "id": "exp", "label": "Cập nhật kinh nghiệm" }]
  }
}
Hãy chọn bước tiếp theo!`;

      const result = extractValidatedProposedChanges(text);
      expect(result.changes).toHaveLength(1);
      expect(result.interactiveQuestion).not.toBeNull();
      expect(result.interactiveQuestion?.id).toBe('q_next');
      expect(result.cleanedText).toBe('Đã cập nhật mục kĩ năng.\n\nHãy chọn bước tiếp theo!');
    });

    it('should repair and extract cut-off / streaming raw JSON without fences', () => {
      const text = `Tôi có câu hỏi sau:
{
  "interactiveQuestion": {
    "id": "q_stream_cut",
    "type": "radio",
    "question": "Bạn đã làm việc bao lâu?",
    "options": [
      { "id": "1", "label": "1 năm"`;

      const result = extractValidatedProposedChanges(text);
      expect(result.interactiveQuestion).not.toBeNull();
      expect(result.interactiveQuestion?.id).toBe('q_stream_cut');
      expect(result.cleanedText).toBe('Tôi có câu hỏi sau:');
    });
  });

  describe('cleanChatResponse', () => {
    it('should clean fenced code blocks from message', () => {
      const fullResponse = `Xin chào!
\`\`\`json
{
  "proposedChanges": [
    {
      "section": "basics",
      "action": "update",
      "newData": { "name": "John" },
      "explanation": "Update"
    }
  ]
}
\`\`\`
Chúc bạn một ngày tốt lành!`;

      const cleaned = cleanChatResponse(fullResponse);
      expect(cleaned).toBe('Xin chào!\n\nChúc bạn một ngày tốt lành!');
    });

    it('should clean naked JSON from message', () => {
      const fullResponse = `Xin chào!
{
  "interactiveQuestion": {
    "id": "q_test",
    "type": "input",
    "question": "Họ tên của bạn?"
  }
}
Cảm ơn bạn!`;

      const cleaned = cleanChatResponse(fullResponse);
      expect(cleaned).toBe('Xin chào!\n\nCảm ơn bạn!');
    });

    it('should clean both fenced and unfenced JSON in the same message', () => {
      const fullResponse = `Đoạn 1
\`\`\`json
{
  "proposedChanges": [
    {
      "section": "basics",
      "action": "update",
      "newData": { "name": "John" },
      "explanation": "Update"
    }
  ]
}
\`\`\`
Đoạn 2
{
  "interactiveQuestion": {
    "id": "q1",
    "type": "input",
    "question": "Email?"
  }
}
Đoạn 3`;

      const cleaned = cleanChatResponse(fullResponse);
      expect(cleaned).toBe('Đoạn 1\n\nĐoạn 2\n\nĐoạn 3');
    });

    it('should preserve regular non-JSON curly braces in text', () => {
      const fullResponse = 'Template mẫu có chứa {tên_ứng_viên} và {vị_trí_ứng_tuyển}.';
      const cleaned = cleanChatResponse(fullResponse);
      expect(cleaned).toBe('Template mẫu có chứa {tên_ứng_viên} và {vị_trí_ứng_tuyển}.');
    });

    it('should return empty string when response is purely JSON payload', () => {
      const fullResponse = `{
  "interactiveQuestion": {
    "id": "q1",
    "type": "input",
    "question": "Email?"
  }
}`;
      const cleaned = cleanChatResponse(fullResponse);
      expect(cleaned).toBe('');
    });
  });
});
