import { createClient } from '@supabase/supabase-js';
import { Project, PlanItem, Event, ContactPerson, Week } from '../types';

// These are your public Supabase keys.
// Security is handled by Supabase Row Level Security (RLS) policies.
const supabaseUrl = 'https://bwwyovaeqnfqqxjmfkir.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d3lvdmFlcW5mcXF4am1ma2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTU0NTUsImV4cCI6MjA3NDczMTQ1NX0.4Uav7prtONWCIYVEzxlc29f4mkJZJtuVC9gkMmjnYqg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const formatPhoneNumberForLink = (phone: string | undefined): string => {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
        digits = '7' + digits.substring(1);
    }
    if (digits.length > 0 && !digits.startsWith('+')) {
        return `+${digits}`;
    }
    return `+${digits.replace('+', '')}`;
};

const sendTelegramNotification = async (project: Project, message: string, inline_keyboard: any[][]) => {
    // 1. Fetch auditor's profile to get Telegram credentials
    const { data: auditorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_bot_token, telegram_chat_id')
      .eq('id', project.user_id)
      .single();
  
    if (profileError || !auditorProfile || !auditorProfile.telegram_bot_token || !auditorProfile.telegram_chat_id) {
      console.warn('Could not send Telegram notification: Auditor profile or credentials not found.');
      return; // Fail silently without blocking UI
    }

    // 2. Send the message via Telegram Bot API
    const { telegram_bot_token, telegram_chat_id } = auditorProfile;
    const url = `https://api.telegram.org/bot${telegram_bot_token}/sendMessage`;

    try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegram_chat_id,
            text: message.trim(),
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: inline_keyboard
            }
          }),
        });
    
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Telegram API error: ${errorData.description}`);
        } else {
          console.log('Telegram notification sent successfully.');
        }
    } catch(e) {
        console.error('Failed to fetch Telegram API', e);
    }
};

export const sendGuestStatusChangeNotification = async (project: Project, week: Week, newStatus: string, authorName: string, rejectionReason: string | null, baseUrl: string) => {
    try {
        const statusLabels = {
            approved: 'Согласовано ✅',
            rejected: 'Отклонено ❌'
        };
        const statusLabel = (statusLabels as any)[newStatus] || newStatus;

        const message = `
*Изменение статуса в проекте "${project.name}"*

*Этап:* ${week.title}
*Новый статус:* *${statusLabel}*
*Кем:* ${authorName}
${rejectionReason ? `\n*Причина отклонения:*\n${rejectionReason}` : ''}
        `;

        const projectUrl = `${baseUrl}#/${project.id}`;
        const inline_keyboard = [[{ text: 'Перейти к проекту', url: projectUrl }]];
        
        await sendTelegramNotification(project, message, inline_keyboard);

    } catch (error) {
        console.error('Failed to send guest status change notification:', error);
    }
};


export const sendGuestEventNotification = async (project: Project, task: PlanItem, event: Event, baseUrl: string) => {
  try {
    const { data: companyProfile } = await supabase
        .from('company_profiles')
        .select('contacts')
        .eq('project_id', project.id)
        .single();
    
    const priorityContact = companyProfile?.contacts?.find((c: ContactPerson) => c.priority_contact_method);

    const inline_keyboard = [];
    
    const commentUrl = `${baseUrl}#/${project.id}?taskId=${task.id}`;
    inline_keyboard.push([{ text: 'Перейти к комментарию', url: commentUrl }]);

    if (priorityContact) {
      let priorityUrl = '';
      let priorityText = '';
      const method = priorityContact.priority_contact_method;

      if (method === 'telegram' && priorityContact.telegram) {
            priorityUrl = `https://t.me/${priorityContact.telegram.replace('@', '')}`;
            priorityText = `Связаться (Telegram)`;
      } else if (method === 'whatsapp' && (priorityContact.whatsapp || priorityContact.phone)) {
          const formattedWhatsapp = formatPhoneNumberForLink(priorityContact.whatsapp || priorityContact.phone);
          if (formattedWhatsapp) {
            priorityUrl = `https://wa.me/${formattedWhatsapp}`;
            priorityText = `Связаться (WhatsApp)`;
          }
      } else if (method === 'email' && priorityContact.email) {
          priorityUrl = `mailto:${priorityContact.email}`;
          priorityText = `Связаться (Email)`;
      } else if (method === 'phone' && priorityContact.phone) {
          priorityUrl = `tel:${priorityContact.phone}`;
          priorityText = `Связаться (Телефон)`;
      }

      if (priorityUrl) {
          inline_keyboard.push([{ text: `${priorityText}: ${priorityContact.name}`, url: priorityUrl }]);
      }
    }

    const message = `
*Новый комментарий в проекте "${project.name}"*

*От:* ${event.author_email}
*Задача:* ${task.title}

*Сообщение:*
${event.content}
    `;

    await sendTelegramNotification(project, message, inline_keyboard);

  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
};


export const sendGuestSubTaskNotification = async (project: Project, parentTask: PlanItem, newSubTask: PlanItem, baseUrl: string) => {
    try {
        const subTaskTypeName = newSubTask.type === 'meeting' ? 'Запрос на встречу' : 'Новая подзадача';
        const guestName = localStorage.getItem('guestName') || 'Гость';

        const message = `
*${subTaskTypeName} в проекте "${project.name}"*

*От:* ${guestName}
*В рамках задачи:* ${parentTask.title}
*Название:* ${newSubTask.title}

*Описание:*
${newSubTask.description || 'Нет описания'}
        `;
        
        const taskUrl = `${baseUrl}#/${project.id}?taskId=${parentTask.id}`;
        const inline_keyboard = [[{ text: 'Перейти к задаче', url: taskUrl }]];

        await sendTelegramNotification(project, message, inline_keyboard);
    } catch (error) {
        console.error('Failed to send guest sub-task notification:', error);
    }
};