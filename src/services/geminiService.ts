import { GoogleGenAI, Type } from "@google/genai";
import { Project, Week, Event, Plan } from '../types';

// Fix: Use process.env.API_KEY to initialize the Gemini client,
// as defined in the `define` section of vite.config.ts.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// This detailed description will be inserted into the prompts
// to guide the AI, since we are using a less strict schema.
const taskSchemaDescriptionForPrompt = `
Каждая задача в массиве 'tasks' должна быть JSON-объектом со следующими полями:
- "id": string (оставь пустым, будет заполнено программно)
- "content": string (краткое, емкое описание задачи в 2-4 предложения)
- "completed": boolean (всегда false по умолчанию)
- "type": string (ОБЯЗАТЕЛЬНО один из: 'task', 'meeting', 'interview', 'doc_review', 'observation')
- "data": object (необязательное поле для дополнительной информации)

Правила для поля "data":
- Для задач с type: 'meeting', объект "data" ОБЯЗАТЕЛЬНО должен содержать:
  - "time": string (в формате "HH:MM")
  - "location": string (например, "Переговорная №1" или "Онлайн")
  - "agenda": string (краткая повестка)
  - "participants": array of strings (участники)
- Для задач с type: 'interview', объект "data" ОБЯЗАТЕЛЬНО должен содержать:
  - "time": string (в формате "HH:MM")
  - "interviewee": string (должность или ФИО опрашиваемого)
- Для других типов задач поле "data" может отсутствовать.
`;

const taskItemSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        content: { type: Type.STRING },
        completed: { type: Type.BOOLEAN },
        type: { type: Type.STRING },
        data: { 
            type: Type.OBJECT,
            properties: {
                time: { type: Type.STRING },
                location: { type: Type.STRING },
                agenda: { type: Type.STRING },
                participants: { type: Type.ARRAY, items: { type: Type.STRING } },
                interviewee: { type: Type.STRING },
            }
        },
    },
    required: ['id', 'content', 'completed', 'type']
};

const dailyPlanSchemaForArray = {
    type: Type.OBJECT,
    properties: {
        date: { type: Type.STRING, description: "Дата в формате YYYY-MM-DD." },
        tasks: {
            type: Type.ARRAY,
            items: taskItemSchema
        }
    },
    required: ['date', 'tasks']
};

const planAsArraySchema = {
    type: Type.ARRAY,
    description: "Массив ежедневных планов.",
    items: dailyPlanSchemaForArray
};


export const generateAuditPlan = async (
  projectName: string,
  projectDescription: string,
  startDate: string,
  endDate: string,
  durationInWeeks: number,
  approvalPeriod: string
): Promise<{ weeks: { title: string, description: string, plan: any, start_date: string, end_date: string }[] }> => {

  const prompt = `
    Создай детальный план аудита для проекта.
    Название проекта: "${projectName}"
    Описание/цели: "${projectDescription}"
    Даты проведения: с ${startDate} по ${endDate}.
    Общая продолжительность: ${durationInWeeks} недель.
    Период отчетности: ${approvalPeriod === 'weekly' ? 'Еженедельно' : 'Ежемесячно'}.

    План должен быть разбит на ${durationInWeeks} этапов (недель).
    Для каждого этапа (недели):
    1. Придумай краткое, емкое название (например, "Этап 1: Сбор и анализ документации") и краткое, емкое описание целей этого этапа (2-4 предложения).
    2. Определи точные даты начала и окончания. Первая неделя начинается ${startDate}. Каждая неделя длится 7 дней.
    3. Составь ежедневный план задач на 5 рабочих дней (ПН-ПТ). Свойство 'plan' для каждой недели должно быть JSON-массивом. Каждый элемент массива - это объект с двумя ключами: "date" (строка в формате 'YYYY-MM-DD') и "tasks" (массив задач на этот день).

    **СТРОГАЯ СХЕМА ДЛЯ ЗАДАЧ:**
    ${taskSchemaDescriptionForPrompt}
    
    Верни результат в виде единого JSON-объекта, соответствующего предоставленной схеме. Не добавляй никаких комментариев или markdown.
  `;
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      weeks: {
        type: Type.ARRAY,
        description: 'Массив этапов (недель) аудита.',
        items: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Название этапа (недели).',
            },
            description: {
                type: Type.STRING,
                description: 'Подробное описание целей и задач этапа.'
            },
            start_date: {
                type: Type.STRING,
                description: 'Дата начала недели в формате YYYY-MM-DD.'
            },
            end_date: {
                type: Type.STRING,
                description: 'Дата окончания недели в формате YYYY-MM-DD.'
            },
            plan: planAsArraySchema,
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
      systemInstruction: "You are an expert AI assistant for business auditors. Your task is to generate a comprehensive audit plan in JSON format based on the user's request. Strictly adhere to the provided JSON schema. Return only raw JSON text.",
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
    },
  });
  
  try {
    const jsonText = (response.text ?? '').trim();
    const parsed = JSON.parse(jsonText);
    
    parsed.weeks.forEach((week: any) => {
        if (week.plan && Array.isArray(week.plan)) {
            const planObject: Plan = {};
            week.plan.forEach((day: { date: string, tasks: any[] }) => {
                if(day.date && day.tasks) {
                    day.tasks.forEach((task: any) => {
                        task.id = crypto.randomUUID();
                        task.completed = false; // Ensure default state
                    });
                    planObject[day.date] = { tasks: day.tasks };
                }
            });
            week.plan = planObject; // Replace the array with the object
        }
    });

    return parsed;
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    console.error("Raw response:", response.text);
    throw new Error("Не удалось сгенерировать план аудита. Ответ от AI имел неверный формат.");
  }
};


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

export const processInterviewAudio = async (
  _base64AudioData: string,
  _mimeType: string,
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

export const generateComprehensiveReport = async (week: Week, project: Project, events: Event[]): Promise<string> => {
    const allTasks = Object.values(week.plan).flatMap(day => day.tasks);
    const completedTasks = allTasks.filter(task => (task.event_count || 0) > 0);
    const inProgressTasks = allTasks.filter(task => !(task.event_count || 0 > 0));

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

export const generateStageDescription = async (
  prompt: string,
): Promise<string> => {
  const fullPrompt = `
    Ты — эксперт по бизнес-аудиту. Помоги аудитору сформулировать детальное, ясное и полное описание целей и задач для этапа аудита.
    Описание должно быть кратким и емким (2-4 предложения), фокусируясь на сути этапа, ключевых действиях и ожидаемых результатах.
    
    Запрос аудитора: "${prompt}"

    Сгенерируй улучшенное описание.
  `;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
    config: {
        systemInstruction: "You are an expert business auditor. Your task is to help a user flesh out the goals and objectives for a stage of their audit. Produce a concise and professional description (2-4 sentences). The output should be only the description text, without any conversational fluff."
    }
  });

  return response.text ?? '';
};

export const generateStagePlan = async (
  title: string,
  description: string,
  startDate: string,
  endDate: string
): Promise<Plan> => {
  const prompt = `
    Основываясь на данных этапа аудита, создай подробный ежедневный план работы для аудитора в формате JSON.

    **Название этапа:** "${title}"
    **Период проведения:** с ${startDate} по ${endDate}
    **Ключевые цели и задачи этапа:** "${description}"

    **ТРЕБОВАНИЯ К JSON:**
    1.  Результат должен быть JSON-массивом.
    2.  Каждый элемент массива - это объект с двумя ключами: "date" (строка в формате 'YYYY-MM-DD', для ВСЕХ дней в указанном диапазоне) и "tasks" (массив задач на этот день).
    3.  Наполни массив \`tasks\` для каждого дня 2-4 конкретными задачами, которые логически вытекают из целей этапа.
    4.  Распредели задачи равномерно и логично по всему периоду.

    **СТРОГАЯ СХЕМА ДЛЯ ЗАДАЧ:**
    ${taskSchemaDescriptionForPrompt}

    Верни ТОЛЬКО JSON-массив без каких-либо дополнительных пояснений или markdown-форматирования.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: "You are an expert AI assistant for business auditors. Your task is to generate a detailed daily plan for a single audit stage in JSON format. Strictly adhere to the user's instructions and the provided schema. Return only raw JSON text.",
      responseMimeType: 'application/json',
      responseSchema: planAsArraySchema,
    },
  });

  try {
    const jsonText = (response.text ?? '').trim();
    const parsedArray = JSON.parse(jsonText);

    const planObject: Plan = {};
    if (Array.isArray(parsedArray)) {
        parsedArray.forEach((day: { date: string, tasks: any[] }) => {
            if(day.date && day.tasks) {
                day.tasks.forEach((task: any) => {
                    task.id = crypto.randomUUID();
                    task.completed = false; // Ensure default state
                });
                planObject[day.date] = { tasks: day.tasks };
            }
        });
    }

    return planObject;
  } catch (e) {
    console.error("Failed to parse Gemini plan response:", e);
    console.error("Raw response:", response.text);
    throw new Error("Не удалось сгенерировать план этапа. Ответ от AI имел неверный формат.");
  }
};