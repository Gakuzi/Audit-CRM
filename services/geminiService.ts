

// Fix: Use the correct import for GoogleGenAI
import { GoogleGenAI, Type } from "@google/genai";
// Fix: Add PlanItem to imports for new functions
import { Project, Week, Event, Plan, ApprovalPeriod, PlanItem } from '../types';

// Fix: Use process.env.API_KEY to initialize the Gemini client,
// as defined in the `define` section of vite.config.ts.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// This detailed description will be inserted into the prompts
// to guide the AI, since we are using a less strict schema.
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

// A simplified schema for a plan object with dynamic date keys.
// This avoids the "properties should be non-empty for OBJECT type" error.
const planSchema = {
  type: Type.OBJECT,
  description: "JSON-объект, представляющий план. Ключи - даты в формате 'YYYY-MM-DD'. Значения - объекты с ключом 'tasks', содержащим массив задач. Структура задач должна строго соответствовать инструкции в промпте."
};

// Fix: Add helper function to describe the approval period for the AI prompt.
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

// Fix: Update function signature to use ApprovalPeriod object and remove durationInWeeks.
export const generateAuditPlan = async (
  projectName: string,
  projectDescription: string,
  startDate: string,
  endDate: string,
  approvalPeriod: ApprovalPeriod
): Promise<{ weeks: { title: string, description: string, plan: any, start_date: string, end_date: string }[] }> => {

  // Fix: Use helper function to create a description for the AI.
  const approvalDescription = describeApprovalPeriod(approvalPeriod);

  // Fix: Update the prompt to be more robust and remove deprecated parameters.
  const prompt = `
    Создай детальный план аудита для проекта.

    **Информация о проекте:**
    - Название: "${projectName}"
    - Описание/цели: "${projectDescription}"
    - Даты проведения: с ${startDate} по ${endDate}.
    - Период отчетности: ${approvalDescription}.

    **Твоя задача:**
    1.  **Разбить проект на этапы.** Разбей весь период проекта на последовательные этапы (недели/периоды), которые соответствуют указанному "Периоду отчетности". Дата окончания каждого этапа должна совпадать с днем отчетности. Даты начала и окончания каждого этапа должны быть точными и идти друг за другом без пропусков.
    2.  **Спланировать каждый этап.** Для каждого этапа придумай краткое, емкое название и подробное описание целей.
    3.  **Составить ежедневный план задач.** Для каждого этапа составь план задач на **рабочие дни (понедельник-пятница)**.
        - **ВАЖНО: Субботу и воскресенье следует оставлять свободными.** Не планируй никаких задач на выходные дни.
        - План должен быть в формате JSON объекта, где ключи - это даты в формате 'YYYY-MM-DD', а значения - это объекты с ключом 'tasks'.
        - Задачи в рамках этапа должны быть распределены последовательно по рабочим дням, не пропуская их.

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
            plan: planSchema,
          },
          required: ['title', 'description', 'plan', 'start_date', 'end_date'],
        },
      },
    },
    required: ['weeks'],
  };

  // Fix: Use the correct API call `ai.models.generateContent`
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
    // Fix: Add nullish coalescing operator to prevent error if response.text is undefined.
    // Fix: Access the response text directly from the response object
    const jsonText = (response.text ?? '').trim();
    const parsed = JSON.parse(jsonText);
    
    parsed.weeks.forEach((week: any) => {
        if (week.plan) {
            Object.values(week.plan).forEach((day: any) => {
                if (day.tasks && Array.isArray(day.tasks)) {
                    day.tasks.forEach((task: any) => {
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
    // Fix: Access the response text directly from the response object
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

  // Fix: Use the correct API call `ai.models.generateContent`
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  });

  // Fix: Add nullish coalescing operator to prevent error if response.text is undefined.
  // Fix: Access the response text directly from the response object
  return response.text ?? '';
};

export const processInterviewAudio = async (
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
    
    // Fix: Use the correct API call `ai.models.generateContent`
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    // Fix: Add nullish coalescing operator to prevent error if response.text is undefined.
    // Fix: Access the response text directly from the response object
    return response.text ?? '';
};

// Fix: Add blobToBase64 helper function
const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

// Fix: Add _processEventsWithFileContent helper function
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

// Fix: Replace generateComprehensiveReport with the more advanced version from src/services/geminiService.ts
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
    Задавай уточняющие вопросы, если первоначальный запрос слишком общий.
    Твоя цель — создать текст, который будет исчерпывающе описывать, что должно быть сделано на этом этапе.
    
    Запрос аудитора: "${prompt}"

    Сгенерируй развернутое описание.
  `;
  // Fix: Use the correct API call `ai.models.generateContent`
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
    config: {
        systemInstruction: "You are an expert business auditor. Your task is to help a user flesh out the goals and objectives for a stage of their audit. Ask clarifying questions if needed to produce a comprehensive and professional description. The output should be only the description text, without any conversational fluff."
    }
  });

  // Fix: Add nullish coalescing operator to prevent error if response.text is undefined.
  // Fix: Access the response text directly from the response object
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
    1.  Результат должен быть одним JSON-объектом.
    2.  Ключами этого объекта должны быть только **рабочие дни (понедельник-пятница)** в указанном диапазоне (с ${startDate} по ${endDate} включительно) в формате 'YYYY-MM-DD'. **Не включай субботу и воскресенье в ключи объекта.**
    3.  Значением для каждой даты должен быть объект вида \`{ "tasks": [] }\`.
    4.  Наполни массив \`tasks\` для каждого рабочего дня 2-4 конкретными задачами, которые логически вытекают из целей этапа.
    5.  Распредели задачи равномерно и логично по рабочим дням.

    **СТРОГАЯ СХЕМА ДЛЯ ЗАДАЧ:**
    ${taskSchemaDescriptionForPrompt}

    Верни ТОЛЬКО JSON-объект без каких-либо дополнительных пояснений или markdown-форматирования.
  `;
  
  // Fix: Use the correct API call `ai.models.generateContent`
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: "You are an expert AI assistant for business auditors. Your task is to generate a detailed daily plan for a single audit stage in JSON format. Strictly adhere to the user's instructions and the provided schema. Return only raw JSON text.",
      responseMimeType: 'application/json',
      responseSchema: planSchema,
    },
  });

  try {
    // Fix: Add nullish coalescing operator to prevent error if response.text is undefined.
    // Fix: Access the response text directly from the response object
    const jsonText = (response.text ?? '').trim();
    const parsedPlan = JSON.parse(jsonText);

    // Ensure all tasks have a valid client-generated UUID
    Object.values(parsedPlan).forEach((day: any) => {
        if (day.tasks && Array.isArray(day.tasks)) {
            day.tasks.forEach((task: any) => {
                task.id = crypto.randomUUID();
                task.completed = false; // Ensure default state
            });
        }
    });

    return parsedPlan as Plan;
  } catch (e) {
    console.error("Failed to parse Gemini plan response:", e);
    // Fix: Access the response text directly from the response object
    console.error("Raw response:", response.text);
    throw new Error("Не удалось сгенерировать план этапа. Ответ от AI имел неверный формат.");
  }
};

// Fix: Add missing functions
export const generateInterviewQuestions = async (taskContext: string): Promise<string> => {
    const prompt = `Ты — AI-ассистент аудитора. Основываясь на контексте задачи, сгенерируй список из 5-7 ключевых вопросов для проведения интервью. Вопросы должны быть открытыми, конкретными и направленными на выяснение фактов, необходимых для аудита.

**Контекст задачи:**
${taskContext}

Верни только список вопросов в формате Markdown.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const generateMindMapFromEvents = async (taskContext: string, events: Event[]): Promise<string> => {
    const prompt = `Ты — AI-ассистент, который умеет создавать ментальные карты (Mind Map) в формате Mermaid. Проанализируй контекст задачи и историю обсуждения, а затем создай ментальную карту, структурирующую ключевые темы, проблемы и выводы.

**Контекст задачи:**
${taskContext}

**История обсуждения (события):**
\`\`\`json
${JSON.stringify(events.map(e => ({ author: e.author_email, content: e.content })), null, 2)}
\`\`\`

**ЗАДАЧА:**
Создай ментальную карту в синтаксисе Mermaid. Карта должна быть логичной и наглядной. Начни с \`mindmap\`.`;

    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const generateMeetingAgenda = async (taskContext: string): Promise<string> => {
    const prompt = `Ты — AI-ассистент аудитора. Основываясь на контексте задачи, сгенерируй повестку для встречи (Meeting Agenda). Повестка должна включать 3-5 ключевых пунктов для обсуждения.

**Контекст задачи:**
${taskContext}

Верни только нумерованный список пунктов в формате Markdown.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const summarizeDiscussion = async (taskContext: string, events: Event[]): Promise<string> => {
    const prompt = `Ты — AI-ассистент, который составляет резюме встреч (Meeting Minutes). Проанализируй контекст задачи и историю обсуждения, а затем напиши краткое резюме.

**Контекст задачи:**
${taskContext}

**История обсуждения (события):**
\`\`\`json
${JSON.stringify(events.map(e => ({ author: e.author_email, content: e.content })), null, 2)}
\`\`\`

**ЗАДАЧА:**
Сформируй резюме, включающее:
1.  **Ключевые решения:** Список принятых решений.
2.  **Дальнейшие шаги:** Список задач с указанием (если возможно) ответственных.
3.  **Открытые вопросы:** Пункты, требующие дальнейшего обсуждения.

Используй Markdown.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const generateDocReviewChecklist = async (taskContext: string): Promise<string> => {
    const prompt = `Ты — AI-ассистент аудитора. Основываясь на контексте задачи, сгенерируй чек-лист для проверки документов. Чек-лист должен содержать 5-8 ключевых пунктов, на которые стоит обратить внимание.

**Контекст задачи:**
${taskContext}

Верни чек-лист в формате Markdown со стандартными чекбоксами (\`- [ ]\`).`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const generateProcessFlowchart = async (taskContext: string, events: Event[]): Promise<string> => {
    const prompt = `Ты — AI-ассистент, который строит блок-схемы (flowcharts) в формате Mermaid. Проанализируй контекст задачи и историю обсуждения, чтобы понять бизнес-процесс. Затем создай блок-схему этого процесса.

**Контекст задачи:**
${taskContext}

**История обсуждения (события):**
\`\`\`json
${JSON.stringify(events.map(e => ({ author: e.author_email, content: e.content })), null, 2)}
\`\`\`

**ЗАДАЧА:**
Создай блок-схему в синтаксисе Mermaid. Схема должна быть простой и логичной. Начни с \`graph TD\`.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const analyzeImageFromUrl = async (imageUrl: string): Promise<string> => {
    const prompt = `Представь, что ты проанализировал изображение по URL: ${imageUrl}. Напиши краткое заключение (2-3 предложения) о том, что могло быть на изображении в контексте аудита (например, "проанализирован документ...", "зафиксировано состояние склада...").`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const analyzeAudioRecording = async (taskContext: string, fileName: string): Promise<string> => {
    const prompt = `Представь, что ты прослушал и проанализировал аудиофайл "${fileName}" в контексте задачи: "${taskContext}". Сгенерируй краткое резюме (3-4 пункта) ключевых моментов, которые могли обсуждаться.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const analyzeDiagram = async (diagramCode: string): Promise<string> => {
    const prompt = `Проанализируй следующую диаграмму в формате Mermaid. Дай краткое заключение (2-3 предложения) о процессе, который она описывает, и укажи на один потенциальный риск или узкое место.

\`\`\`mermaid
${diagramCode}
\`\`\`
`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};


const formatChatHistory = (events: Event[]): string => {
    return events
        .map(e => {
            const author = e.author_email === 'AI Ассистент' ? 'AI' : `User (${e.author_email})`;
            let content = e.content;
            if (e.data?.file_urls && e.data.file_urls.length > 0) {
                content += ` [Прикреплен файл: ${e.data.file_urls[0].name}]`;
            }
            return `${author}: ${content}`;
        })
        .join('\n');
};

export const continueConversation = async (task: PlanItem, events: Event[], userQuery: string): Promise<string> => {
    const processedEvents = await _processEventsWithFileContent(events);
    const history = formatChatHistory(processedEvents as Event[]);

    const prompt = `
        Ты — AI-ассистент в системе аудита. Ведется обсуждение задачи.
        Твоя задача — осмысленно ответить на последний вопрос пользователя, основываясь на всей истории переписки и контексте задачи.

        **Контекст задачи:**
        - Название: ${task.title}
        - Описание: ${task.description || 'Нет'}

        **История диалога:**
        ${history}
        User (${userQuery.split(':')[0]}): ${userQuery.split(':')[1]}

        Твой ответ:
    `;

    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};

export const summarizeAndContinue = async (task: PlanItem, events: Event[]): Promise<string> => {
    const processedEvents = await _processEventsWithFileContent(events);
    
    const history = formatChatHistory(processedEvents as Event[]);
    
    const prompt = `
        Ты — AI-ассистент в системе аудита. Аудитор попросил тебя проанализировать всю переписку по задаче.
        Твоя задача — синтезировать всю информацию из диалога и приложенных файлов, подвести итог, выявить нерешенные вопросы и предложить следующий логический шаг.
        Твой ответ должен быть структурированным и полезным для аудитора.

        **Контекст задачи:**
        - Название: ${task.title}
        - Описание: ${task.description || 'Нет'}

        **История диалога для анализа:**
        ${history}

        **Сформируй ответ, включающий:**
        1.  **Краткое резюме:** В 1-2 предложениях опиши текущий статус задачи.
        2.  **Ключевые выводы:** Список из 2-3 основных моментов, которые были выяснены.
        3.  **Открытые вопросы:** Что до сих пор неясно или требует дополнительной информации?
        4.  **Рекомендация:** Какой следующий шаг ты предлагаешь сделать?

        Используй Markdown для форматирования.
    `;

    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
};
