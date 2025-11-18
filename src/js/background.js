chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "searchUserProfile",
        title: "Найти пользователя \"%s\"",
        contexts: ["selection"]
    });
});

// Создание вкладки с переходом по собранному URL
function openUserProfileTab(hostname, query) {
    const url = `https://${hostname}/demo/dispetcher/users/?q=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url, active: false });
}

// Находим кнопку "отписаться" и извлекаем URL клиента
function extractSenderAndDomain(selectedText) {
    const links = document.querySelectorAll('.letter-body__body-content a');
    const targetLink = Array.from(links).find(a =>
        a.textContent.toLowerCase().includes('отписаться')
    );

    const url = targetLink?.href;
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    return { hostname, selectedText, targetLink };
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

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [info.selectionText],
        func: extractSenderAndDomain,
    }, (results) => {
        const result = results?.[0]?.result;
        console.log({result})
        if (result?.hostname && result?.selectedText) {
            openUserProfileTab(result.hostname, result.selectedText);
        } else {
            console.warn('Не удалось извлечь sender или domain с текущей страницы');
        }
    });
});

function extractLoginAndDomain() {
    let loginText = null;
    let targetLink = null;

    // 1. Ищем контейнер, содержащий информацию о заявителе
    const contentNode = document.querySelector('.user-content_mr_css_attr');

    if (contentNode) {
        // Ищем ссылку, которая находится после текста "Логин заявителя:"
        // Поскольку структура DOM сложная, найдем все ссылки в контейнере
        const links = contentNode.querySelectorAll('a');

        for (const link of links) {
            loginText = link.textContent.trim();
        }
    }

    // 2. Находим ссылку "отписаться" (для домена)
    const unsubscribeLink = Array.from(document.querySelectorAll('.letter-body__body-content a')).find(a =>
        a.textContent.toLowerCase().includes('отписаться')
    );

    targetLink = unsubscribeLink;

    if (!loginText || !targetLink?.href) {
        return { query: '', hostname: null };
    }

    // 3. Извлекаем домен
    try {
        const urlObj = new URL(targetLink.href);
        const hostname = urlObj.hostname;
        // Возвращаем логин в качестве "query"
        return { query: loginText, hostname };
    } catch (e) {
        console.error("Некорректный URL в ссылке отписки:", e);
        return { query: loginText, hostname: null };
    }
}

// 👂 Обработчик нажатия комбинации клавиш (Ctrl+Shift+S)
chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle_user_search") { // 'toggle_user_search' из manifest.json
        // Получаем информацию о текущей активной вкладке
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            if (!currentTab?.id) {
                return;
            }

            // Вызываем НОВУЮ функцию, которая ищет логин в DOM
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: extractLoginAndDomain, // Используем новую функцию
            }, (results) => {
                const result = results?.[0]?.result;
                console.log({ result });

                // Используем result.query, который содержит логин
                if (result?.hostname && result?.query) {
                    openUserProfileTab(result.hostname, result.query);
                } else {
                    console.warn('Не удалось извлечь логин или домен по сочетанию клавиш.');
                }
            });
        });
    }
});