chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "searchUserProfile",
        title: "Найти пользователя \"%s\"",
        contexts: ["selection"]
    });
});

// Создание вкладки с переходом по собранному URL
function openUserProfileTab(domain, query) {
    const url = `https://${domain}.rozentalgroup.ru/demo/dispetcher/users/?q=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url });
}

// Извлекаем sender и домен внутри страницы
function extractSenderAndDomain(selectedText) {
    const contactEl = document.querySelector('.letter-contact');
    const sender = contactEl?.getAttribute('title');
    const [domain] = sender ? sender.split('@') : [''];
    return { sender, domain, selectedText };
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
        if (result?.domain && result?.selectedText) {
            openUserProfileTab(result.domain, result.selectedText);
        } else {
            console.warn('Не удалось извлечь sender или domain с текущей страницы');
        }
    });
});
