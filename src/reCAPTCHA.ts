import CustomError from "./Error";
import { launch } from "puppeteer";
import request from "request-promise-native";
const timeout = (millis: number) => new Promise(resolve => setTimeout(resolve, millis));
import poll from "promise-poller";


export default class recaptchaBypass {
    constructor(readonly nomor: string, readonly captchakey2: string) {
        const ovoNumberPatter = /^[\d\+\-\.\(\)\/\s]*$/g;
        if (!ovoNumberPatter.test(nomor)) throw new CustomError('Invalid Number!');
    }

    async pollForRequestResults(key: string, id: any, retries = 30, interval = 1500, delay = 15000) {
        await timeout(delay);
        return poll({
          taskFn: await this.requestCaptchaResults(key, id),
          interval,
          retries
        });
      }

    async requestCaptchaResults(apiKey = this.captchakey2, requestId: any) {
        const url = `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${requestId}&json=1`;
        return async function() {
          return new Promise(async function(resolve, reject){
            const rawResponse = await request.get(url);
            const resp = JSON.parse(rawResponse);
            if (resp.status === 0) return reject(resp.request);
            resolve(resp.request);
          });
        }
      }

    async initiate() {
        
        const formData = {
            method: 'userrecaptcha',
            key: this.captchakey2,
            googlekey: '6LdvDpkUAAAAAEdoB6mxFulV9DDjFCNI62sWC1Qo',
            pageurl: 'https://ovo.id/points/check',
            json: 1
        };

        const response = await request.post('http://2captcha.com/in.php', {form: formData});
        const requestId = JSON.parse(response).request;

        return requestId;
    }

    async bypass() {
        const browser = await launch({ headless: false, defaultViewport: null, slowMo: 10 });
        const page = await browser.newPage();

        await page.goto('https://ovo.id/points/check', { waitUntil: "domcontentloaded" });
        await page.evaluate(() => {
            // Nomor Telpon
            document.querySelectorAll("input")[1].value = this.nomor;
        });
        const requestId = await this.initiate();

        const response = await this.pollForRequestResults(this.captchakey2, requestId);

        await page.evaluate(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`);
        await page.click('button#send-otp');
        await page.waitForFunction(() => {});
        const otentikasi = prompt('Code Authentication: ');
        await page.evaluate(() => {
            (document.querySelectorAll("input")[4] as any).value = otentikasi;
            document.querySelector('button[class="btn-send"]')?.click();
        });
        await page.waitForFunction(() => {});
        await page.evaluate(async () => {
            const ava = document.querySelector('label[class="text-danger text-danger-point"]');
            if (!ava) {
                await page.close();
                await browser.close();
            }
        });
    }
}