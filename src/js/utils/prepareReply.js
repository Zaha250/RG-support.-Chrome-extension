/** Выполняется в контексте вкладки: функция должна оставаться автономной. */
export async function prepareReply(content) {
    const fail = message => ({ success: false, message });
    const isVisible = element => element.getClientRects().length > 0;
    const composers = Array.from(document.querySelectorAll('.compose-app')).filter(isVisible);
    const focusedComposer = document.activeElement?.closest('.compose-app');
    const composer = composers.includes(focusedComposer)
        ? focusedComposer
        : composers.length === 1 ? composers[0] : null;

    if (!composer) {
        return fail(composers.length > 1
            ? 'Открыто несколько окон письма. Оставьте открытым одно окно ответа.'
            : 'Откройте окно ответа на письмо в Mail.ru.');
    }

    const editor = composer.querySelector('.cke_editable[contenteditable="true"]');
    const recipients = composer.querySelector('[data-name="to"]');
    const input = recipients?.querySelector('input[type="text"]');
    if (!editor || !input) {
        return fail('Не удалось найти поле ответа или поле «Кому».');
    }

    // Вначале читаем цитату именно этого ответа, чтобы не взять данные другого письма.
    const quote = editor.querySelector('[data-quote-id][data-type="body"], blockquote');
    const letterBodies = Array.from(document.querySelectorAll('.letter-body__body-content'))
        .filter(isVisible);
    const source = quote || (letterBodies.length === 1 ? letterBodies[0] : null);
    if (!source) {
        return fail('Не удалось найти исходное обращение с данными заявителя.');
    }

    const sourceCopy = source.cloneNode(true);
    sourceCopy.querySelectorAll('script, style').forEach(node => node.remove());
    sourceCopy.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
    sourceCopy.querySelectorAll('p, div, tr, li').forEach(node => {
        node.prepend('\n');
        node.append('\n');
    });
    const text = sourceCopy.textContent;
    const readField = label => text.match(
        new RegExp(`(?:^|\\n)[\\t \\u00a0]*${label}[\\t \\u00a0]*:[\\t \\u00a0]*([^\\r\\n]*)`, 'i')
    )?.[1].trim() || '';
    const address = readField('E-mail[\\t \\u00a0]+заявителя')
        || readField('Логин[\\t \\u00a0]+заявителя');

    if (!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(address)) {
        return fail('В полях «E-mail заявителя» и «Логин заявителя» не найден корректный email.');
    }

    const getContacts = () => Array.from(recipients.querySelectorAll('[data-type="to"]'))
        .filter(node => node.className.split(/\s+/).some(name => name.startsWith('contact--')));
    const contacts = getContacts();
    if (contacts.some(contact => !contact.querySelector('button'))) {
        return fail('Не удалось определить кнопки удаления текущих адресатов.');
    }

    // Удаляем служебный адрес через интерфейс, чтобы обновилось состояние Mail.ru.
    for (let index = 0; index < contacts.length; index += 1) {
        getContacts()[0]?.querySelector('button')?.click();
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (getContacts().length > 0) {
        return fail('Не удалось очистить поле «Кому». Проверьте адресатов письма.');
    }

    input.focus();
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    valueSetter.call(input, address);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    for (const type of ['keydown', 'keypress', 'keyup']) {
        input.dispatchEvent(new KeyboardEvent(type, {
            key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
        }));
    }
    input.blur();
    await new Promise(resolve => setTimeout(resolve, 0));

    const hasAddress = getContacts().some(contact =>
        contact.textContent.toLowerCase().includes(address.toLowerCase())
        || Array.from(contact.querySelectorAll('[data-test-id]')).some(node =>
            node.getAttribute('data-test-id').toLowerCase().includes(address.toLowerCase()))
    );
    if (!hasAddress) {
        return fail('Mail.ru не подтвердил добавление адресата. Проверьте поле «Кому» и повторите вставку.');
    }

    // Нативная операция редактирования сохраняет подпись, цитату и историю отмены.
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(true);
    editor.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    const template = document.createElement('div');
    template.textContent = content;
    const html = template.innerHTML.replace(/\r\n?|\n/g, '<br>');
    if (!document.execCommand('insertHTML', false, `<div>${html}</div><br>`)) {
        return fail('Адресат заполнен, но вставить шаблон не удалось. Проверьте поле ответа.');
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return { success: true, message: `Шаблон вставлен. Адресат: ${address}` };
}
