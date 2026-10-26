chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        const error = chrome.runtime.lastError;
        if (error) {
            console.warn('Не удалось обновить контекстное меню:', error.message);
            return;
        }

        chrome.contextMenus.create({
            id: "searchUserProfile",
            title: "Найти пользователя \"%s\"",
            contexts: ["selection"]
        }, () => {
            const createError = chrome.runtime.lastError;
            if (createError) {
                console.warn('Не удалось создать пункт поиска пользователя:', createError.message);
            }
        });
    });
});

// Создание вкладки с переходом по собранному URL
function openUserProfileTab(hostname, query) {
    const url = `https://${hostname}/demo/dispetcher/users/?q=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url, active: false });
}

// Обработчик клика по контекстному меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (
        info.menuItemId !== "searchUserProfile" ||
        !info.selectionText ||
        !tab?.id
    ) {
        return;
    }

    searchUserProfile(tab.id, info.selectionText);
});

// Функция передаётся в executeScript и не должна зависеть от внешних переменных.
function extractLoginAndDomain(selectedText = '') {
    const letterBodies = Array.from(document.querySelectorAll('.letter-body__body-content'));
    const searchRoots = letterBodies.length > 0 ? letterBodies : [document.body];

    for (const root of searchRoots) {
        if (!root) {
            continue;
        }

        let query = selectedText.trim();
        if (!query) {
            const content = root.cloneNode(true);
            content.querySelectorAll('script, style').forEach(node => node.remove());
            content.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
            content.querySelectorAll('a').forEach(node => node.append('\n'));
            content.querySelectorAll('p, div, tr, li').forEach(node => {
                node.prepend('\n');
                node.append('\n');
            });

            const match = content.textContent.match(
                /(?:^|\n)\s*Логин\s+заявителя[\t \u00a0]*:[\t \u00a0]*([^\r\n]*)/i
            );
            query = match?.[1].trim() || '';
        }

        if (!query) {
            continue;
        }

        for (const link of root.querySelectorAll('a[href]')) {
            let url;
            try {
                url = new URL(link.getAttribute('href'));
            } catch {
                continue;
            }

            if (url.protocol !== 'https:' && url.protocol !== 'http:') {
                continue;
            }

            if (url.pathname.replace(/\/+$/, '').endsWith('/user/unsubscribe') ||
                /отписаться/i.test(link.textContent)) {
                return { query, hostname: url.hostname };
            }
        }
    }

    return { query: '', hostname: null };
}

function searchUserProfile(tabId, selectedText = '') {
    chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: extractLoginAndDomain,
        args: [selectedText]
    }, (results) => {
        const error = chrome.runtime.lastError;
        if (error) {
            console.warn('Не удалось прочитать письмо для поиска пользователя:', error.message);
            return;
        }

        const result = results?.find(item => item.result?.hostname && item.result?.query)?.result;
        if (!result) {
            console.warn('В письме не найдены логин заявителя или ссылка отписки с доменом клиента.');
            return;
        }

        openUserProfileTab(result.hostname, result.query);
    });
}

// Обработчик нажатия комбинации клавиш (Ctrl+Shift+S)
chrome.commands.onCommand.addListener((command) => {
    if (command !== 'toggle_user_search') {
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const error = chrome.runtime.lastError;
        if (error) {
            console.warn('Не удалось определить активную вкладку:', error.message);
            return;
        }

        const currentTab = tabs?.[0];
        if (currentTab?.id == null) {
            return;
        }

        searchUserProfile(currentTab.id);
    });
});
