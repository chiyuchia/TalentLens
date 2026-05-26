import json
import re
from dataclasses import dataclass
from typing import Any

from .prompts import CANDIDATE_EVALUATOR_SYSTEM_PROMPT, RESUME_PARSER_SYSTEM_PROMPT

DATE_TOKEN_PATTERN = r"(?:19|20)\d{2}(?:[./\-年](?:0?[1-9]|1[0-2])月?)?|至今|现在|Present|Current|Now"
PERIOD_PATTERN = re.compile(
    rf"({DATE_TOKEN_PATTERN})\s*(?:[-~—–至到]|to)\s*({DATE_TOKEN_PATTERN})",
    re.IGNORECASE,
)
SINGLE_DATE_PATTERN = re.compile(DATE_TOKEN_PATTERN, re.IGNORECASE)

SECTION_ALIASES = {
    "education": [
        "教育",
        "教育背景",
        "教育经历",
        "education",
        "academic background",
        "educational background",
    ],
    "work": [
        "工作",
        "工作经历",
        "工作经验",
        "实习经历",
        "experience",
        "work experience",
        "professional experience",
        "employment history",
        "internship experience",
    ],
    "projects": [
        "项目",
        "项目经历",
        "项目经验",
        "projects",
        "project experience",
    ],
    "skills": [
        "技能",
        "专业技能",
        "技能清单",
        "skills",
        "technical skills",
    ],
}
OTHER_SECTION_ALIASES = [
    "个人信息",
    "基本信息",
    "联系方式",
    "证书",
    "获奖",
    "荣誉",
    "自我评价",
    "求职意向",
    "profile",
    "contact",
    "certifications",
    "awards",
    "summary",
]
ALL_SECTION_ALIASES = [
    alias for aliases in SECTION_ALIASES.values() for alias in aliases
] + OTHER_SECTION_ALIASES


@dataclass(frozen=True)
class AiService:
    mode: str = "mock"
    api_key: str = ""
    base_url: str = ""
    model: str = ""

    def extract_resume(self, text: str) -> dict[str, Any]:
        if self.mode == "real":
            return self._extract_resume_real(text)

        email_match = re.search(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", text)
        phone_match = re.search(r"(?:\+?\d[\d\s().-]{7,}\d)", text)
        first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")

        return {
            "name": first_line[:80] or "模拟候选人",
            "phone": phone_match.group(0).strip() if phone_match else "",
            "email": email_match.group(0) if email_match else "",
            "city": "",
            "education": self._extract_mock_education(text),
            "work_experience": self._extract_mock_work_experience(text),
            "skills": self._mock_skills(text),
            "projects": self._extract_mock_projects(text),
        }

    def extract_resume_stream(self, text: str):
        if self.mode == "real":
            if not self.api_key:
                raise RuntimeError("AI_MODE=real 时必须配置 API Key（OPENAI_API_KEY 或 MOONSHOT_API_KEY）。")

            from openai import OpenAI

            base_url = self.base_url or ""
            is_kimi_like = any(token in base_url for token in ("moonshot", "kimi.com"))

            headers = {}
            if is_kimi_like:
                headers["User-Agent"] = "claude-code/1.0.0"

            client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url or None,
                default_headers=headers,
            )

            model = self.model or ("kimi-for-coding" if is_kimi_like else "gpt-4o-mini")

            extra_kwargs = {}
            if not is_kimi_like:
                extra_kwargs["response_format"] = {"type": "json_object"}

            messages = [
                {"role": "system", "content": RESUME_PARSER_SYSTEM_PROMPT},
                {"role": "user", "content": text[:18000]},
            ]

            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.2,
                stream=True,
                **extra_kwargs,
            )
            for chunk in response:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    yield delta
        else:
            profile = self.extract_resume(text)
            profile_json = json.dumps(profile, ensure_ascii=False, indent=2)
            chunk_size = 15
            import time
            for i in range(0, len(profile_json), chunk_size):
                yield profile_json[i:i+chunk_size]
                time.sleep(0.02)

    def score_candidate(self, profile: dict[str, Any], job: dict[str, Any]) -> dict[str, Any]:
        if self.mode == "real":
            return self._score_candidate_real(profile, job)

        candidate_skills = {str(skill).lower() for skill in profile.get("skills", [])}
        required_skills = {str(skill).lower() for skill in job.get("required_skills", [])}
        bonus_skills = {str(skill).lower() for skill in job.get("bonus_skills", [])}
        required_hits = len(candidate_skills & required_skills)
        bonus_hits = len(candidate_skills & bonus_skills)
        skill_score = 60
        if required_skills:
            skill_score = min(
                100, round(required_hits / len(required_skills) * 80 + bonus_hits * 5)
            )
        experience_score = 75 if profile.get("work_experience") else 50
        education_score = 75 if profile.get("education") else 50
        total_score = round(skill_score * 0.5 + experience_score * 0.3 + education_score * 0.2)

        return {
            "total_score": total_score,
            "skill_score": skill_score,
            "experience_score": experience_score,
            "education_score": education_score,
            "ai_comment": "本地模拟评分：候选人与该岗位具备基础匹配度。",
            "details": {
                "matched_required_skills": sorted(candidate_skills & required_skills),
                "matched_bonus_skills": sorted(candidate_skills & bonus_skills),
            },
        }

    def _extract_resume_real(self, text: str) -> dict[str, Any]:
        return self._call_json_model(
            [
                {"role": "system", "content": RESUME_PARSER_SYSTEM_PROMPT},
                {"role": "user", "content": text[:18000]},
            ]
        )

    def _score_candidate_real(self, profile: dict[str, Any], job: dict[str, Any]) -> dict[str, Any]:
        result = self._call_json_model(
            [
                {"role": "system", "content": CANDIDATE_EVALUATOR_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {"profile": profile, "job": job}, ensure_ascii=False
                    ),
                },
            ]
        )
        return self._normalize_score(result)

    def _call_json_model(self, messages: list[dict[str, str]]) -> dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("AI_MODE=real 时必须配置 API Key（OPENAI_API_KEY 或 MOONSHOT_API_KEY）。")

        from openai import OpenAI

        base_url = self.base_url or ""
        is_kimi_like = any(token in base_url for token in ("moonshot", "kimi.com"))

        headers = {}
        if is_kimi_like:
            headers["User-Agent"] = "claude-code/1.0.0"

        client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url or None,
            default_headers=headers,
        )

        # Moonshot / Kimi 接口不支持 response_format={"type": "json_object"}
        # 通过 system prompt 要求返回 JSON，然后解析
        model = self.model or ("kimi-for-coding" if is_kimi_like else "gpt-4o-mini")

        extra_kwargs = {}
        if not is_kimi_like:
            extra_kwargs["response_format"] = {"type": "json_object"}

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.2,
            **extra_kwargs,
        )
        content = response.choices[0].message.content or "{}"
        return self._extract_json(content)

    def _extract_json(self, text: str) -> dict[str, Any]:
        text = text.strip()
        if text.startswith("```"):
            # Extract JSON from markdown code block
            lines = text.splitlines()
            # Remove first line (```json or ```)
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            # Remove last line (```)
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        return json.loads(text)

    def _normalize_score(self, value: dict[str, Any]) -> dict[str, Any]:
        def score(key: str) -> int:
            return max(0, min(100, int(value.get(key, 0))))

        return {
            "total_score": score("total_score"),
            "skill_score": score("skill_score"),
            "experience_score": score("experience_score"),
            "education_score": score("education_score"),
            "ai_comment": str(value.get("ai_comment", "")),
            "details": value.get("details") if isinstance(value.get("details"), dict) else {},
        }

    def _mock_skills(self, text: str) -> list[str]:
        known = [
            "Python",
            "Flask",
            "React",
            "TypeScript",
            "SQL",
            "Docker",
            "AWS",
            "Java",
            "Node.js",
            "Machine Learning",
        ]
        lowered = text.lower()
        found = [skill for skill in known if skill.lower() in lowered]
        return found

    def _extract_mock_education(self, text: str) -> list[dict[str, str]]:
        lines = self._section_lines(text, SECTION_ALIASES["education"])
        if not lines:
            lines = [
                line
                for line in self._clean_lines(text)
                if self._contains_school(line) or self._contains_degree(line)
            ]

        entries = []
        for group in self._group_lines(lines, self._looks_like_education_start):
            joined = " ".join(group)
            school = self._extract_school(group)
            degree = self._extract_degree(joined)
            period = self._extract_period(joined)
            major = self._extract_major(joined, school, degree, period)
            if school or major or degree or period:
                entries.append(
                    {
                        "school": school,
                        "major": major,
                        "degree": degree,
                        "graduation_time": period,
                    }
                )
        return entries

    def _extract_mock_work_experience(self, text: str) -> list[dict[str, str]]:
        lines = self._section_lines(text, SECTION_ALIASES["work"])
        if not lines:
            lines = [
                line
                for line in self._clean_lines(text)
                if self._extract_period(line) and self._contains_company_or_title(line)
            ]

        entries = []
        for group in self._group_lines(lines, self._looks_like_work_start):
            joined = " ".join(group)
            period = self._extract_period(joined)
            company = self._extract_company(group, period)
            title = self._extract_title(group, company, period)
            summary = self._extract_summary(group, [company, title, period])
            if company or title or period or summary:
                entries.append(
                    {
                        "company": company,
                        "title": title,
                        "period": period,
                        "summary": summary,
                    }
                )
        return entries

    def _extract_mock_projects(self, text: str) -> list[dict[str, Any]]:
        lines = self._section_lines(text, SECTION_ALIASES["projects"])
        if not lines:
            lines = [
                line
                for line in self._clean_lines(text)
                if "项目" in line.lower() or "project" in line.lower()
            ]

        entries = []
        for group in self._group_lines(lines, self._looks_like_project_start):
            joined = " ".join(group)
            name = self._extract_project_name(group)
            tech_stack = self._known_skills(joined)
            responsibilities = self._extract_project_detail(group, ["职责", "负责", "responsibil"])
            highlights = self._extract_project_detail(group, ["亮点", "成果", "成效", "优化", "提升", "highlight"])
            if not responsibilities:
                responsibilities = self._extract_summary(group[1:], [name])
            if name or tech_stack or responsibilities or highlights:
                entries.append(
                    {
                        "name": name,
                        "tech_stack": tech_stack,
                        "responsibilities": responsibilities,
                        "highlights": highlights,
                    }
                )
        return entries

    def _clean_lines(self, text: str) -> list[str]:
        return [line.strip() for line in text.splitlines() if line.strip()]

    def _section_lines(self, text: str, aliases: list[str]) -> list[str]:
        lines = self._clean_lines(text)
        start_index = next(
            (
                index
                for index, line in enumerate(lines)
                if self._is_section_heading(line, aliases)
            ),
            None,
        )
        if start_index is None:
            return []

        section_lines = []
        for line in lines[start_index + 1 :]:
            if self._is_section_heading(line, ALL_SECTION_ALIASES):
                break
            section_lines.append(self._strip_bullet(line))
        return [line for line in section_lines if line]

    def _is_section_heading(self, line: str, aliases: list[str]) -> bool:
        normalized = re.sub(r"[\s:：/｜|_-]+", " ", line.strip().lower()).strip()
        normalized = re.sub(r"\s+", " ", normalized)
        if len(normalized) > 40:
            return False
        return any(
            normalized == alias.lower()
            or normalized.startswith(f"{alias.lower()} ")
            or normalized.endswith(f" {alias.lower()}")
            for alias in aliases
        )

    def _strip_bullet(self, line: str) -> str:
        return re.sub(r"^[\s\-*•·●○▪▫◦\d.、)）]+", "", line).strip()

    def _group_lines(self, lines: list[str], start_detector) -> list[list[str]]:
        groups: list[list[str]] = []
        current: list[str] = []
        for raw_line in lines:
            line = self._strip_bullet(raw_line)
            if not line:
                continue
            if current and start_detector(line):
                groups.append(current)
                current = [line]
                continue
            current.append(line)
        if current:
            groups.append(current)
        return groups

    def _extract_period(self, text: str) -> str:
        match = PERIOD_PATTERN.search(text)
        if match:
            return f"{match.group(1)} - {match.group(2)}"

        dates = SINGLE_DATE_PATTERN.findall(text)
        if dates:
            return dates[-1]
        return ""

    def _remove_period(self, text: str, period: str) -> str:
        if not period:
            return text
        start, _, end = period.partition(" - ")
        text = text.replace(start, "")
        if end:
            text = text.replace(end, "")
        return text.replace(period, "")

    def _contains_school(self, line: str) -> bool:
        lowered = line.lower()
        return any(
            keyword in lowered
            for keyword in ["大学", "学院", "学校", "university", "college", "institute", "school"]
        )

    def _contains_degree(self, line: str) -> bool:
        return bool(
            re.search(
                r"博士|硕士|研究生|本科|学士|大专|ph\.?d|doctor|master|bachelor|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?",
                line,
                re.IGNORECASE,
            )
        )

    def _looks_like_education_start(self, line: str) -> bool:
        return self._contains_school(line) or bool(self._extract_period(line) and self._contains_degree(line))

    def _extract_school(self, lines: list[str]) -> str:
        for line in lines:
            if not self._contains_school(line):
                continue
            without_period = self._remove_period(line, self._extract_period(line))
            parts = re.split(r"\s{2,}|[|｜]", without_period)
            candidate = parts[0].strip(" -—–,，;；")
            if re.search(r"[\u4e00-\u9fff]", candidate) and re.search(r"\s", candidate):
                sub_parts = re.split(r"\s+|[,，;；]", candidate)
                for part in sub_parts:
                    part_stripped = part.strip(" -—–,，;；")
                    if self._contains_school(part_stripped):
                        return part_stripped
            match = re.search(
                r"([\u4e00-\u9fffA-Za-z0-9&.'’（）()\-\s]{0,50}(?:大学|学院|学校|University|College|Institute|School)[\u4e00-\u9fffA-Za-z0-9&.'’（）()\-\s]{0,50})",
                candidate,
                re.IGNORECASE,
            )
            if match:
                return match.group(1).strip(" -—–,，;；")
            return candidate[:80]
        return ""

    def _extract_degree(self, text: str) -> str:
        degree_patterns = [
            ("博士", r"博士|ph\.?d|doctor"),
            ("硕士", r"硕士|研究生|master|m\.?s\.?|m\.?a\.?"),
            ("本科", r"本科|学士|bachelor|b\.?s\.?|b\.?a\.?"),
            ("大专", r"大专|专科|associate"),
        ]
        for label, pattern in degree_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return label
        return ""

    def _extract_major(self, text: str, school: str, degree: str, period: str) -> str:
        major_match = re.search(r"(?:专业|major)[:：\s]*([^\n,，;；|｜]+)", text, re.IGNORECASE)
        if major_match:
            return major_match.group(1).strip()

        cleaned = self._remove_period(text, period)
        for value in [school, degree]:
            if value:
                cleaned = cleaned.replace(value, "")
        cleaned = re.sub(r"毕业|学历|专业|major|degree", "", cleaned, flags=re.IGNORECASE)
        parts = [
            part.strip(" -—–,，;；")
            for part in re.split(r"\s{2,}|[|｜/]", cleaned)
            if part.strip(" -—–,，;；")
        ]
        return parts[0][:80] if parts else ""

    def _contains_company_or_title(self, line: str) -> bool:
        lowered = line.lower()
        company_keywords = ["公司", "科技", "集团", "inc", "ltd", "llc", "corp", "company", "co."]
        title_keywords = [
            "工程师",
            "开发",
            "经理",
            "产品",
            "设计",
            "实习",
            "engineer",
            "developer",
            "manager",
            "designer",
            "analyst",
            "intern",
        ]
        return any(keyword in lowered for keyword in company_keywords + title_keywords)

    def _looks_like_work_start(self, line: str) -> bool:
        return bool(self._extract_period(line) and self._contains_company_or_title(line))

    def _extract_company(self, lines: list[str], period: str) -> str:
        for line in lines[:3]:
            if not self._contains_company_or_title(line):
                continue
            cleaned = self._remove_period(line, period)
            parts = [
                part.strip(" -—–,，;；")
                for part in re.split(r"\s{2,}|[|｜]", cleaned)
                if part.strip(" -—–,，;；")
            ]
            if parts:
                candidate = parts[0]
                if re.search(r"[\u4e00-\u9fff]", candidate) and re.search(r"\s", candidate):
                    sub_parts = re.split(r"\s+", candidate)
                    if sub_parts:
                        return sub_parts[0][:80]
                return candidate[:80]
        return ""

    def _extract_title(self, lines: list[str], company: str, period: str) -> str:
        title_pattern = re.compile(
            r"([\u4e00-\u9fffA-Za-z0-9+/&.\-\s]*(?:工程师|开发|经理|产品|设计|顾问|实习生|实习|Engineer|Developer|Manager|Designer|Analyst|Consultant|Architect|Intern)[\u4e00-\u9fffA-Za-z0-9+/&.\-\s]*)",
            re.IGNORECASE,
        )
        for line in lines[:3]:
            cleaned = self._remove_period(line, period)
            if company:
                cleaned = cleaned.replace(company, "")
            match = title_pattern.search(cleaned)
            if match:
                return match.group(1).strip(" -—–,，;；")[:80]
        return ""

    def _extract_summary(self, lines: list[str], ignored_values: list[str]) -> str:
        details = []
        for line in lines:
            cleaned = line
            for value in ignored_values:
                if value:
                    cleaned = cleaned.replace(value, "")
            cleaned = self._remove_period(cleaned, self._extract_period(cleaned)).strip(" -—–,，;；")
            if cleaned:
                details.append(cleaned)
        return "；".join(details[:4])[:300]

    def _looks_like_project_start(self, line: str) -> bool:
        lowered = line.lower()
        return (
            "项目" in lowered
            or "project" in lowered
            or bool(self._extract_period(line) and len(line) <= 80)
        )

    def _extract_project_name(self, lines: list[str]) -> str:
        for line in lines:
            cleaned = re.sub(r"^(?:项目名称|项目|project name|project)[:：\s]*", "", line, flags=re.IGNORECASE)
            cleaned = self._remove_period(cleaned, self._extract_period(cleaned)).strip(" -—–,，;；")
            if cleaned:
                return cleaned[:80]
        return ""

    def _extract_project_detail(self, lines: list[str], keywords: list[str]) -> str:
        for line in lines:
            lowered = line.lower()
            if any(keyword.lower() in lowered for keyword in keywords):
                return re.sub(r"^[^:：]{0,12}[:：]\s*", "", line).strip()[:300]
        return ""

    def _known_skills(self, text: str) -> list[str]:
        return self._mock_skills(text)
