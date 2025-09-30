import { createClient } from '@supabase/supabase-js';
import { Project, PlanItem, Event } from '../types';

// These are your public Supabase keys.
// Security is handled by Supabase Row Level Security (RLS) policies.
const supabaseUrl = 'https://bwwyovaeqnfqqxjmfkir.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d3lvdmFlcW5mcXF4am1ma2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTU0NTUsImV4cCI6MjA3NDczMTQ1NX0.4Uav7prtONWCIYVEzxlc29f4mkJZJtuVC9gkMmjnYqg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const sendGuestEventNotification = async (project: Project, task: PlanItem, event: Event) => {
  try {
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

    // 2. Format the message
    const eventTypeName = event.type === 'meeting' ? 'Запрос на встречу' : 'Комментарий';
    const message = `
*${eventTypeName} в проекте "${project.name}"*

*От:* ${event.author_email}
*Задача:* ${task.content}

*Сообщение:*
${event.content}
    `;

    // 3. Send the message via Telegram Bot API
    const { telegram_bot_token, telegram_chat_id } = auditorProfile;
    const url = `https://api.telegram.org/bot${telegram_bot_token}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegram_chat_id,
        text: message.trim(),
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Telegram API error: ${errorData.description}`);
    }

    console.log('Telegram notification sent successfully.');

  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
};