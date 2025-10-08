import { GoogleGenAI } from "@google/genai";
import { Project, Week, Event, Plan, ApprovalPeriod, PlanItem } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const taskSchemaDescriptionForPrompt = `
Каждая задача в массиве 'tasks' должна быть JSON-объектом со следующими полями:
- "id": string (оставь пустым, будет заполнено программно)
- "title": string (КРАТКОЕ, емкое название задачи, до 10 слов)
- "description": string (ОПЦИОНАЛЬНОЕ, подробное описание задачи, если требуется)
- "completed": boolean (всегда false по умолчанию)
- "type": string (ОБЯЗАТЕЛЬНО один из: 'task', 'meeting', 'interview', 'doc_review', 'observation', 'process_analysis')
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

const describeApprovalPeriod = (period: ApprovalPeriod): string => {
    if (period.type === 'daily') {
        if (period.interval === 1) return 'ежедневно';
        return `каждые ${period.interval} дня`;
    }
    if (period.type === 'weekly') {
        const days = ['воскресеньям', 'понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам'];
        const dayName = days[period.dayOfWeek || 0];
        return `каждую неделю по ${dayName}`;
    }
    return 'еженедельно'; // fallback
}

const safeJsonParse = (jsonString: string) => {
    // In case the model still wraps the output in markdown, try to extract it.
    const jsonMatch = jsonString.match(/```(?:json)?\n([\s\S]*?)\n```/);
    const finalJsonText = jsonMatch ? jsonMatch[1] : jsonString;
    try {
        return JSON.parse(finalJsonText);
    } catch (e) {
        console.error("Failed to parse JSON string:", finalJsonText);
        throw new Error("Invalid JSON format from AI.");
    }
}

export const generateAuditPlan = async (
  projectName: string,
  projectDescription: string,
  startDate: string,
  endDate: string | undefined,
  approvalPeriod: ApprovalPeriod
): Promise<{ weeks: { title: string, description: string, plan: any, start_date: string, end_date: string }[] }> => {

  const approvalDescription = describeApprovalPeriod(approvalPeriod);
  const prompt = `
    Создай детальный план аудита для проекта.

    **Информация о проекте:**
    - Название: "${projectName}"
    - Описание/цели: "${projectDescription}"
    - Даты проведения: с ${startDate} по ${endDate || 'не указана'}.
    - Период отчетности: ${approvalDescription}.

    **Твоя задача:**
    1.  **Разбить проект на этапы.** Разбей весь период проекта на последовательные этапы (недели/периоды), которые соответствуют указанному "Периоду отчетности". Дата окончания каждого этапа должна совпадать с днем отчетности. Даты начала и окончания каждого этапа должны быть точными и идти друг за другом без пропусков.
    2.  **Спланировать каждый этап.** Для каждого этапа придумай краткое, емкое название и подробное описание целей.
    3.  **Составить ежедневный план задач.** Для каждого этапа составь план задач на **рабочие дни (понедельник-пятница)**.
        - **ВАЖНО: Субботу и воскресенье следует оставлять свободными.** Не планируй никаких задач на выходные дни.
        - План должен быть в формате JSON объекта, где ключи - это даты в формате 'YYYY-MM-DD', а значения - это объекты с ключом 'tasks'.
        - Задачи в рамках этапа должны быть распределены последовательно по рабочим дням, не пропуская их.

    **СТРОГАЯ СХЕМА ДЛЯ ЗАДАЧ:**
    Когда это уместно, используй разнообразные типы задач: 'task', 'meeting', 'interview', 'doc_review', 'observation', 'process_analysis'.
    ${taskSchemaDescriptionForPrompt}
    
    **СТРОГИЙ ФОРМАТ ВЫВОДА:**
    Верни результат в виде ОДНОГО JSON-объекта, имеющего следующую структуру. Не добавляй никаких комментариев или markdown.
    {
      "weeks": [
        {
          "title": "Название этапа (недели)",
          "description": "Подробное описание целей этапа.",
          "start_date": "YYYY-MM-DD",
          "end_date": "YYYY-MM-DD",
          "plan": {
            "YYYY-MM-DD": {
              "tasks": [ /* массив задач на этот день, соответствующих схеме задач */ ]
            }
          }
        }
      ]
    }
    Ключевой массив должен называться "weeks". Каждый объект в этом массиве должен иметь ключи "title", "description", "start_date", "end_date", и "plan".
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: "You are an expert AI assistant for business auditors. Your task is to generate a comprehensive audit plan in JSON format based on the user's request. Strictly adhere to the schema described in the prompt. Your response MUST be only the raw JSON text, without any markdown, comments, or other text.",
      responseMimeType: 'application/json',
    },
  });
  
  try {
    const parsed = safeJsonParse(response.text);
    
    parsed.weeks.forEach((week: any) => {
        if (week.plan) {
            Object.values(week.plan).forEach((day: unknown) => {
                const dayPlan = day as { tasks: PlanItem[] };
                if (dayPlan.tasks && Array.isArray(dayPlan.tasks)) {
                    dayPlan.tasks.forEach((task: PlanItem) => {
                        task.id = crypto.randomUUID();
                        task.completed = false; // Ensure default state
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

const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

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

const _processEventsWithFileContent = async (events: Event[]) => {
    return Promise.all(events.map(async event => {
        if (!event.data?.file_urls) return event;

        const processedFiles = await Promise.all(event.data.file_urls.map(async file => {
            try {
                const response = await fetch(file.url);
                if (!response.ok) return { ...file, content: '[Ошибка: Не удалось загрузить файл]' };
                
                const blob = await response.blob();
                const mimeType = blob.type || file.type || '';

                if (mimeType.startsWith('image/')) {
                    const base64 = await blobToBase64(blob);
                    const dataUri = `data:${mimeType};base64,${base64}`;
                    return { ...file, type: mimeType, content: dataUri };
                }
                if (mimeType.startsWith('text/')) {
                    const text = await blob.text();
                    return { ...file, type: mimeType, content: text };
                }
                return { ...file, type: mimeType, content: `[Контент файла (${mimeType}) недоступен для анализа]` };
            } catch (e: any) {
                return { ...file, content: `[Ошибка обработки файла: ${e.message}]` };
            }
        }));
        
        return { ...event, data: { ...event.data, file_urls: processedFiles } };
    }));
}

export const generateComprehensiveReport = async (week: Week, project: Project, events: Event[]): Promise<string> => {
    const allTasks = Object.values(week.plan).flatMap(day => day.tasks);
    const completedTasks = allTasks.filter(task => (task.event_count || 0) > 0);
    const inProgressTasks = allTasks.filter(task => !((task.event_count || 0) > 0));

    const processedEvents = await _processEventsWithFileContent(events);


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
        *Проанализируй этот JSON массив событий. Если в объекте файла есть поле "content", оно содержит либо **Data URI изображения (data:image/...)**, либо текст из документа. Проанализируй это содержимое напрямую для получения точных выводов. Основывай свой анализ ИСКЛЮЧИТЕЛЬНО на предоставленных данных.*
        \`\`\`json
        ${JSON.stringify(processedEvents.map(e => ({ type: e.type, content: e.content, author: e.author_email, date: e.created_at, files: e.data?.file_urls?.map(f => ({ name: f.name, type: f.type, content: (f as any).content })) })), null, 2)}
        \`\`\`

    **ЗАДАЧА: Сформируй отчет, включающий следующие разделы:**

    ### 1. Общая сводка по этапу
    Начни с краткого резюме (2-3 предложения) о проделанной работе, общем прогрессе и достижении целей этапа. Оцени, насколько успешно прошел этап.

    ### 2. Ключевые результаты и выполненные работы
    *   Перечисли наиболее значимые **выполненные** задачи.
    *   Опиши главные результаты, полученные в ходе этапа. Что было выяснено, подтверждено или опровергнуто? **Используй данные из журнала событий и содержимое прикрепленных файлов для конкретики.**
    *   Если были встречи или интервью (события типа 'meeting' или 'interview'), кратко изложи их итоги на основе комментариев.
    *   Если были прикреплены документы (события 'documentation_review' или файлы в комментариях), упомяни, какие документы были проанализированы и какие выводы из этого следуют, основываясь на их содержимом.

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
    Твоя цель — создать текст, который будет исчерпывающе описывать, что должно быть сделано на этом этапе.
    
    Запрос аудитора: "${prompt}"

    Сгенерируй развернутое описание. Не добавляй никаких вступлений или заключений, верни только сам текст описания.
  `;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
    config: {
        systemInstruction: "You are an expert business auditor. Your task is to help a user flesh out the goals and objectives for a stage of their audit. Produce a comprehensive and professional description. The output should be only the description text, without any conversational fluff."
    }
  });

  return response.text ?? '';
};

export const generateStagePlan = async (
  title: string,
  description: string,
  startDate: string,
  endDate: string | undefined
): Promise<Plan> => {
  const prompt = `
    Основываясь на данных этапа аудита, создай подробный ежедневный план работы для аудитора в формате JSON.

    **Название этапа:** "${title}"
    **Период проведения:** с ${startDate} по ${endDate || 'не указана'}
    **Ключевые цели и задачи этапа:** "${description}"

    **ТРЕБОВАНИЯ К JSON:**
    1.  Результат должен быть одним JSON-объектом.
    2.  Ключами этого объекта должны быть только **рабочие дни (понедельник-пятница)** в указанном диапазоне (с ${startDate} по ${endDate || 'не указана'} включительно).
    3.  **ВАЖНО: Не включай субботу и воскресенье в ключи объекта.**
    4.  Значением для каждой даты должен быть объект вида \`{ "tasks": [] }\`.
    5.  Наполни массив \`tasks\` для каждого рабочего дня 2-4 конкретными задачами, которые логически вытекают из целей этапа. Распредели задачи равномерно и последовательно по рабочим дням.

    **СТРОГАЯ СХЕМА ДЛЯ ЗАДАЧ:**
    Используй разнообразные типы задач, когда это уместно: 'task', 'meeting', 'interview', 'doc_review', 'observation', 'process_analysis'.
    ${taskSchemaDescriptionForPrompt}

    **СТРОГИЙ ФОРМАТ ВЫВОДА:**
    Верни ТОЛЬКО JSON-объект без каких-либо дополнительных пояснений или markdown-форматирования. Пример структуры:
    {
      "2025-10-01": {
        "tasks":