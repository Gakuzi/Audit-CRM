import { GoogleGenAI, Type } from "@google/genai";
import { Project, Week, Event, Plan } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const taskSchemaDescriptionForPrompt = `
Каждая задача в массиве 'tasks' должна быть JSON-объектом со следующими полями:
- "id": string (оставь пустым)
- "content": string (подробное описание задачи)
- "completed": boolean (всегда false)
- "type": string (ОБЯЗАТЕЛЬНО один из: 'task', 'meeting', 'interview', 'doc_review', 'observation', 'process_analysis')
- "data": object (необязательное поле)

Правила для "data":
- Для type: 'meeting', ОБЯЗАТЕЛЬНО должен содержать:
  - "time": string (СТРОГО в формате "HH:MM")
  - "location": string
  - "agenda": string
  - "participants": array of strings
- Для type: 'interview', ОБЯЗАТЕЛЬНО должен содержать:
  - "time": string (СТРОГО в формате "HH:MM")
  - "interviewee": string
- Для других типов поле "data" может отсутствовать.
`;

const planSchema = {
  type: Type.OBJECT,
  description: "JSON-объект, где ключи - даты 'YYYY-MM-DD', а значения - {'tasks': [...]}. Структура задач должна строго соответствовать инструкции."
};

// --- Core Plan Generation ---

export const generateAuditPlan = async (
  projectName: string,
  projectDescription: string,
  startDate: string,
  endDate: string,
  durationInWeeks: number,
  approvalPeriod: string
): Promise<{ weeks: { title: string, description: string, plan: any, start_date: string, end_date: string }[] }> => {

  const prompt = `
    Создай детальный план аудита.
    Проект: "${projectName}"
    Описание: "${projectDescription}"
    Даты: с ${startDate} по ${endDate}.
    Продолжительность: ${durationInWeeks} недель.
    Отчетность: ${approvalPeriod === 'weekly' ? 'Еженедельно' : 'Ежемесячно'}.

    Разбей план на ${durationInWeeks} этапов (недель).
    Для каждого этапа:
    1. Краткое название и емкое описание (2-4 предложения).
    2. Точные даты начала и окончания (первая неделя с ${startDate}, каждая 7 дней).
    3. Ежедневный план на 5 рабочих дней (ПН-ПТ) в формате JSON.

    **СТРОГАЯ СХЕМА ДЛЯ ЗАДАЧ:**
    ${taskSchemaDescriptionForPrompt}
    
    Верни результат в виде единого JSON-объекта. Без комментариев и markdown.
  `;
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      weeks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            start_date: { type: Type.STRING },
            end_date: { type: Type.STRING },
            plan: planSchema,
          },
          required: ['title', 'description', 'plan', 'start_date', 'end_date'],
        },
      },
    },
    required: ['weeks'],
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: "You are an expert AI assistant for business auditors. Generate a comprehensive audit plan in JSON format. Strictly adhere to the provided JSON schema. Return only raw JSON text.",
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
    },
  });
  
  try {
    const jsonText = (response.text ?? '').trim();
    const parsed = JSON.parse(jsonText);
    
    parsed.weeks.forEach((week: any) => {
        if (week.plan) {
            Object.values(week.plan).forEach((day: any) => {
                if (day.tasks && Array.isArray(day.tasks)) {
                    day.tasks.forEach((task: any) => {
                        task.id = crypto.randomUUID();
                        task.completed = false;
                    });
                }
            });
        }
    });

    return parsed;
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    console.error("Raw response:", response.text);
    throw new Error("Не удалось сгенерировать план аудита. Ответ от AI имел неверный формат.");
  }
};

export const generateStagePlan = async (
  title: string,
  description: string,
  startDate: string,
  endDate: string
): Promise<Plan> => {
  const prompt = `
    Основываясь на данных этапа аудита, создай подробный ежедневный план в формате JSON.
    Название этапа: "${title}"
    Период: с ${startDate} по ${endDate}
    Цели: "${description}"

    ТРЕБОВАНИЯ К JSON:
    1. Ключи - ВСЕ дни в диапазоне в формате 'YYYY-MM-DD'.
    2. Значение - \`{ "tasks": [...] }\`.
    3. Наполни \`tasks\` 2-4 задачами по теме этапа.
    4. Распредели задачи логично по дням.

    **СТРОГАЯ СХЕМА ДЛЯ ЗАДАЧ:**
    ${taskSchemaDescriptionForPrompt}

    Верни ТОЛЬКО JSON-объект.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: "You are an AI assistant for auditors. Generate a daily plan for an audit stage in JSON format. Strictly adhere to the schema. Return only raw JSON text.",
      responseMimeType: 'application/json',
      responseSchema: planSchema,
    },
  });

  try {
    const jsonText = (response.text ?? '').trim();
    const parsedPlan = JSON.parse(jsonText);
    Object.values(parsedPlan).forEach((day: any) => {
        if (day.tasks && Array.isArray(day.tasks)) {
            day.tasks.forEach((task: any) => {
                task.id = crypto.randomUUID();
                task.completed = false;
            });
        }
    });
    return parsedPlan as Plan;
  } catch (e) {
    console.error("Failed to parse Gemini plan response:", e);
    console.error("Raw response:", response.text);
    throw new Error("Не удалось сгенерировать план этапа. Ответ от AI имел неверный формат.");
  }
};


// --- Specialized Tools ---

export const generateInterviewQuestions = async (taskContent: string): Promise<string> => {
    const prompt = `Для задачи-интервью "${taskContent}", сгенерируй список из 5-7 ключевых открытых вопросов, которые аудитор должен задать. Отформатируй как Markdown список.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const generateMindMapFromEvents = async (taskContent: string, events: Event[]): Promise<string> => {
    const prompt = `
      Проанализируй задачу "${taskContent}" и связанное с ней обсуждение в формате JSON:
      ${JSON.stringify(events.map(e => ({ author: e.author_email, content: e.content })), null, 2)}
      
      Сгенерируй ментальную карту (mind map), которая визуализирует ключевые темы, идеи и связи из этого обсуждения.
      Используй синтаксис Mermaid. Код должен начинаться с \`mindmap\`. Не оборачивай в \`\`\`mermaid.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const generateMeetingAgenda = async (taskContent: string): Promise<string> => {
    const prompt = `Для встречи с темой "${taskContent}", сгенерируй краткую повестку из 3-5 пунктов. Отформатируй как Markdown список.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const summarizeDiscussion = async (taskContent: string, events: Event[]): Promise<string> => {
    const prompt = `
      Проанализируй обсуждение по задаче "${taskContent}". JSON событий:
      ${JSON.stringify(events.map(e => ({ author: e.author_email, content: e.content })), null, 2)}

      Напиши краткое резюме (meeting minutes), выделив основные принятые решения и поставленные задачи (action items). Отформатируй как Markdown.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const generateDocReviewChecklist = async (taskContent: string): Promise<string> => {
    const prompt = `Для задачи по анализу документов "${taskContent}", сгенерируй чек-лист в формате Markdown из 5-7 ключевых пунктов, на которые аудитору следует обратить внимание.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const generateProcessFlowchart = async (taskContent: string, events: Event[]): Promise<string> => {
    const prompt = `
      Проанализируй задачу по анализу процесса "${taskContent}" и ее обсуждение:
      ${JSON.stringify(events.map(e => ({ author: e.author_email, content: e.content })), null, 2)}

      Сгенерируй простую блок-схему (flowchart), иллюстрирующую основные шаги этого процесса.
      Используй синтаксис Mermaid (graph TD). Код должен начинаться с \`graph TD\`. Не оборачивай в \`\`\`mermaid.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

// --- Reporting ---
// Fix: Added missing function generateComprehensiveReport.
export const generateComprehensiveReport = async (week: Week, project: Project, events: Event[]): Promise<string> => {
    const allTasks = Object.values(week.plan).flatMap(day => day.tasks);
    const completedTasks = allTasks.filter(task => (task.event_count || 0) > 0);
    const inProgressTasks = allTasks.filter(task => !((task.event_count || 0) > 0));

    const prompt = `
    Ты — профессиональный бизнес-аудитор. Твоя задача — сгенерировать исчерпывающий отчет о ходе аудита за прошедший этап (неделю) для собственника бизнеса.
    Отчет должен быть структурированным, официальным, но при этом ясным и понятным. Используй Markdown для форматирования.

    **Входные данные для анализа:**

    1.  **Проект:**
        *   Название: "${project.name}"
        *   Цели: "${project.description}"

    2.  **Отчетный этап:**
        *   Название: "${week.title}"
        *   Даты: с ${week.start_date} по ${week.end_date}

    3.  **План на этап:**
        *   **Всего запланировано задач:** ${allTasks.length}
        *   **Выполненные задачи (по которым есть активность):** ${completedTasks.length}
        *   **Задачи в работе (без активности):** ${inProgressTasks.length}

    4.  **Журнал событий (комментарии, встречи, файлы):**
        *Проанализируй этот JSON массив событий, чтобы понять динамику работы, ключевые обсуждения, прикрепленные документы и результаты встреч.*
        \`\`\`json
        ${JSON.stringify(events.map(e => ({ type: e.type, content: e.content, author: e.author_email, date: e.created_at, files: e.data?.file_urls?.map(f => f.name) })), null, 2)}
        \`\`\`

    **ЗАДАЧА: Сформируй отчет, включающий следующие разделы:**

    ### 1. Общая сводка по этапу
    Начни с краткого резюме (2-3 предложения) о проделанной работе, общем прогрессе и достижении целей этапа. Оцени, насколько успешно прошел этап.

    ### 2. Ключевые результаты и выполненные работы
    *   Перечисли наиболее значимые **выполненные** задачи.
    *   Опиши главные результаты, полученные в ходе этапа. Что было выяснено, подтверждено или опровергнуто? Используй данные из журнала событий для конкретики.
    *   Если были встречи или интервью (события типа 'meeting' или 'interview'), кратко изложи их итоги на основе комментариев.
    *   Если были прикреплены документы (события 'documentation_review' или файлы в комментариях), упомяни, какие документы были проанализированы и какие выводы из этого следуют.

    ### 3. Выявленные трудности, риски и открытые вопросы
    *   Проанализируй комментарии и обсуждения. Есть ли признаки проблем, разногласий, нехватки информации?
    *   Опиши любые возникшие трудности (например, задержки в предоставлении данных, недоступность сотрудников).
    *   Сформулируй потенциальные риски для бизнеса, которые были выявлены на этом этапе.
    *   Перечисли задачи, которые все еще находятся в работе, и укажи, почему по ним пока нет результата.

    ### 4. Рекомендации и следующие шаги
    *   На основе анализа данных, дай 2-3 конкретные, действенные рекомендации для руководства.
    *   Кратко опиши, что планируется делать на следующем этапе аудита, чтобы логически продолжить начатую работу.

    Твой отчет должен быть убедительным и подкрепленным фактами из предоставленных данных.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text ?? '';
}

// --- Media Processing ---
// Fix: Added missing function recognizeTextFromImage.
export const recognizeTextFromImage = async (base64ImageData: string): Promise<string> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64ImageData,
    },
  };
  const textPart = {
    text: "Распознай и верни весь рукописный и печатный текст с этого изображения. Сохрани оригинальное форматирование, включая переносы строк и отступы, насколько это возможно. Верни только текст, без каких-либо дополнительных комментариев или пояснений.",
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  });

  return response.text ?? '';
};

// Fix: Added missing function processInterviewAudio.
export const processInterviewAudio = async (
  base64AudioData: string,
  mimeType: string,
  interviewContext: string
): Promise<string> => {
    // Note: The standard generateContent API does not support direct audio file inputs.
    // This function simulates the analysis by using a text prompt based on the interview context.
    // A production implementation would typically use a Speech-to-Text service first,
    // then send the resulting transcript to the Gemini API for analysis.

    const prompt = `
        Представь, что ты - ассистент аудитора. Тебе предоставлен контекст интервью.
        Твоя задача - проанализировать этот контекст и сгенерировать краткую сводку, основные выводы и ключевые моменты, которые могли бы обсуждаться.
        
        Контекст интервью: "${interviewContext}"
        
        Основываясь на контексте, напиши отчет, который мог бы получиться после анализа аудиозаписи.
        Отчет должен включать:
        1.  **Краткая сводка:** 1-2 предложения о теме разговора.
        2.  **Ключевые моменты:** Список из 3-5 самых важных тезисов или фактов, упомянутых в ходе интервью.
        3.  **Выводы и риски:** Какие выводы можно сделать? Есть ли какие-то потенциальные риски, о которых стоит упомянуть?
        4.  **Дальнейшие шаги:** Какие действия следует предпринять аудитору на основе этого интервью?

        Отформатируй ответ, используя markdown.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text ?? '';
};


// --- Other ---

export const generateStageDescription = async (prompt: string): Promise<string> => {
  const fullPrompt = `Ты — эксперт по бизнес-аудиту. Помоги аудитору сформулировать детальное описание для этапа аудита. Запрос аудитора: "${prompt}". Сгенерируй развернутое описание.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
    config: { systemInstruction: "You are an expert business auditor. Help the user flesh out the goals for a stage of their audit. Output only the description text." }
  });
  return response.text ?? '';
};