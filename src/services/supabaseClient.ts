import { createClient } from '@supabase/supabase-js';
import { Project, PlanItem, Event, ContactPerson, Week } from '../types';

const supabaseUrl = 'https://bwwyovaeqnfqqxjmfkir.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d3lvdmFlcW5mcXF4am1ma2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTU0NTUsImV4cCI6MjA3NDczMTQ1NX0.4Uav7prtONWCIYVEzxlc29f4mkJZJtuVC9gkMmjnYqg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: fetch,
    },
});

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
    const { data: auditorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_bot_token, telegram_chat_id')
      .eq('id', project.user_id)
      .single();
  
    if (profileError || !auditorProfile || !auditorProfile.telegram_bot_token || !auditorProfile.telegram_chat_id) {
      console.warn('Could not send Telegram notification: Auditor profile or credentials not found.');
      return;
    }

    const { telegram_bot_token, telegram_chat_id } = auditorProfile;
    const url = `https://api.telegram.org/bot${telegram_bot_token}/sendMessage`;

    try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegram_chat_id,
            text: message.trim(),
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inline_keyboard }
          }),
        });
    } catch(e) {
        console.error('Failed to fetch Telegram API', e);
    }
};

export const sendGuestStatusChangeNotification = async (project: Project, week: Week, newStatus: string, authorName: string, rejectionReason: string | null, baseUrl: string) => {
    const statusLabels: Record<string, string> = { approved: 'Согласовано ✅', rejected: 'Отклонено ❌' };
    const statusLabel = statusLabels[newStatus] || newStatus;

    const message = `*Изменение статуса в проекте "${project.name}"*\n\n*Этап:* ${week.title}\n*Новый статус:* *${statusLabel}*\n*Кем:* ${authorName}${rejectionReason ? `\n\n*Причина отклонения:*\n${rejectionReason}` : ''}`;
    const projectUrl = `${baseUrl}#/${project.id}`;
    await sendTelegramNotification(project, message, [[{ text: 'Перейти к проекту', url: projectUrl }]]);
};


export const sendGuestEventNotification = async (project: Project, task: PlanItem, event: Event, baseUrl: string) => {
    const { data: companyProfile } = await supabase.from('company_profiles').select('contacts').eq('project_id', project.id).single();
    const priorityContact = (companyProfile?.contacts as ContactPerson[])?.find(c => c.priority_contact_method);

    const inline_keyboard = [[{ text: 'Перейти к комментарию', url: `${baseUrl}#/${project.id}?taskId=${task.id}` }]];

    if (priorityContact) {
      let url = '', text = '';
      const { priority_contact_method, telegram, whatsapp, phones, emails, name } = priorityContact;
      const primaryPhone = phones?.[0];
      const primaryEmail = emails?.[0];

      if (priority_contact_method === 'telegram' && telegram) { url = `https://t.me/${telegram.replace('@', '')}`; text = 'Связаться (Telegram)'; }
      else if (priority_contact_method === 'whatsapp' && (whatsapp || primaryPhone)) { url = `https://wa.me/${formatPhoneNumberForLink(whatsapp || primaryPhone)}`; text = 'Связаться (WhatsApp)'; }
      else if (priority_contact_method === 'email' && primaryEmail) { url = `mailto:${primaryEmail}`; text = `Связаться (Email)`; }
      else if (priority_contact_method === 'phone' && primaryPhone) { url = `tel:${primaryPhone}`; text = `Связаться (Телефон)`; }
      if (url) inline_keyboard.push([{ text: `${text}: ${name}`, url }]);
    }
    await sendTelegramNotification(project, `*Новый комментарий в проекте "${project.name}"*\n\n*От:* ${event.author_email}\n*Задача:* ${task.title}\n\n*Сообщение:*\n${event.content}`, inline_keyboard);
};


export const sendGuestSubTaskNotification = async (project: Project, parentTask: PlanItem, newSubTask: PlanItem, baseUrl: string) => {
    const typeName = newSubTask.type === 'meeting' ? 'Запрос на встречу' : 'Новая подзадача';
    const guestName = localStorage.getItem('guestName') || 'Гость';
    const message = `*${typeName} в проекте "${project.name}"*\n\n*От:* ${guestName}\n*В рамках задачи:* ${parentTask.title}\n*Название:* ${newSubTask.title}\n\n*Описание:*\n${newSubTask.description || 'Нет описания'}`;
    await sendTelegramNotification(project, message, [[{ text: 'Перейти к задаче', url: `${baseUrl}#/${project.id}?taskId=${parentTask.id}` }]]);
};