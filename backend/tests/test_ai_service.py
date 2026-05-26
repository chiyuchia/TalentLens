from app.services.ai_service import AiService


def test_mock_resume_extraction_uses_resume_text_for_experience_sections():
    resume_text = """
张三
zhangsan@example.com
教育经历
清华大学 计算机科学与技术 本科 2018.09 - 2022.06
工作经历
字节跳动 后端工程师 2022.07 - 至今
负责 Flask API 开发与 SQL 性能优化
项目经历
TalentLens 智能简历分析平台
技术栈：React, TypeScript, Flask, SQL
负责上传解析和候选人评分模块
"""

    profile = AiService(mode="mock").extract_resume(resume_text)

    assert profile["education"][0]["school"] == "清华大学"
    assert "计算机" in profile["education"][0]["major"]
    assert profile["education"][0]["degree"] == "本科"
    assert profile["work_experience"][0]["company"] == "字节跳动"
    assert "后端工程师" in profile["work_experience"][0]["title"]
    assert "Flask API" in profile["work_experience"][0]["summary"]
    assert profile["projects"][0]["name"] == "TalentLens 智能简历分析平台"
    assert "React" in profile["projects"][0]["tech_stack"]
    assert "本地模拟提取" not in str(profile)


def test_mock_resume_extraction_returns_empty_sections_when_not_found():
    profile = AiService(mode="mock").extract_resume("张三\nzhangsan@example.com")

    assert profile["education"] == []
    assert profile["work_experience"] == []
    assert profile["projects"] == []
