const { Builder, By, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function createIncognitoBrowser() {
    let chromeOptions = new chrome.Options().addArguments("--incognito");
    let driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
    return driver;
}

async function openWindowAndTest(name, roomNumber) {
    let driver = await createIncognitoBrowser();
    await driver.manage().window().setRect({width: 400, height: 800});
    await driver.get('https://zlzai.xyz');  // or whatever site you want
    await driver.findElement(By.id('playerNameInput')).sendKeys(name, Key.RETURN);
    await driver.findElement(By.id('roomNumberInput')).sendKeys(roomNumber, Key.RETURN);
    await driver.findElement(By.id('joinRoom')).click();
}

(async function main() {
    // const inputs = ['Input 1', 'Input 2', 'Input 3', 'Input 4', 'Input 5'];

    for (let i = 0; i < 5; i++) {
        await openWindowAndTest("p" + i, 1111);
    }
})();
