import {
  getFilters,
  exitFullscreen,
  getFullscreenElement,
  selectorToElement,
  withIframe,
} from "./utils/dom";
import { base64StringToArrayBuffer, x64hash128 } from "./utils/hash";
import {
  MaybePromise,
  suppressUnhandledRejectionWarning,
  wait,
} from "./utils/async";
import {
  CanvasFingerprint,
  ContrastPreference,
  Environments,
  FrameSize,
  IEventParams,
  IGetTouchSupport,
  IGetVideoCardInfo,
  InnerErrorName,
  PluginData,
  PluginMimeTypeData,
  SpecialFingerprint,
} from "./utils/types";
import {
  canvasToString,
  doesSupportWinding,
  isSupported,
  makeCanvasContext,
  renderGeometryImage,
  renderTextImage,
} from "./utils/canvas";
import {
  objectToCanonicalString,
  paramToString,
  unknownStringValue as defaultStringValue,
} from "./utils/formaters";
import {
  baseFonts,
  defaultPresetText,
  fontList,
  fontsPreferencesPresets,
  testFontString,
  textSizeForFontInfo,
  vendorFlavorKeys,
} from "./utils/constants";
import { matchGenerator } from "./utils/csshelper";
import { countTruthy, replaceNaN, round, toFloat, toInt } from "./utils/data";
import {
  identifyChromium,
  isAndroid,
  isChrome,
  isChromium,
  isChromium86OrNewer,
  isDesktopSafari,
  isEdgeHTML,
  isFirefox,
  isIPad,
  isMSIE,
  isSafari,
  isTrident,
  isWebKit,
  isWebKit606OrNewer,
} from "./utils/browser";
import { IndexDB } from "./utils/indexdb";
import {
  chromePrivateTest,
  firefoxPrivateTest,
  msiePrivateTest,
  safariPrivateTest,
} from "./utils/browser-tests";
import { FingerprintApi } from "./api";
import EZCrypto from "@justinwwolcott/ez-web-crypto";

const isBrowser = new Function(
  "try {return this===window;}catch(e){ return false;}"
);
const isNode = new Function(
  "try {return this===global;}catch(e){return false;}"
);

export class Device {
  public ezCrypto: EZCrypto;
  private hash: Function;
  private subtle: SubtleCrypto | undefined;
  private unknownStringValue = defaultStringValue;
  private fingerprint: string = this.unknownStringValue;
  screenColorDepth: string = this.unknownStringValue;
  colorGamut: string = this.unknownStringValue;
  contrastPreferences: string = this.unknownStringValue;
  cookiesEnabled: string = this.unknownStringValue;
  osInfo: string = this.unknownStringValue;
  deviceMemory: string = this.unknownStringValue;
  deviceColorsForced: string = this.unknownStringValue;
  hardwareConcurrency: string = this.unknownStringValue;
  usingHDR: string = this.unknownStringValue;
  colorsInverted: string = this.unknownStringValue;
  languages: string = this.unknownStringValue;
  osCpu: string = this.unknownStringValue;
  platform: string = this.unknownStringValue;
  screenResolution: string = this.unknownStringValue;
  timezone: string = this.unknownStringValue;
  touchSupport: string = this.unknownStringValue;
  maxTouchPoints: string = this.unknownStringValue;
  private gpu: string = this.unknownStringValue;
  gpuVendor: string = this.unknownStringValue;
  gpuRenderer: string = this.unknownStringValue;
  private navigator?: Navigator;
  appName: string = this.unknownStringValue;
  appVersion: string = this.unknownStringValue;
  userAgent: string = this.unknownStringValue;
  pdfViewerEnabled: string = this.unknownStringValue;
  appCodeName: string = this.unknownStringValue;
  product: string = this.unknownStringValue;
  currentBrowserBuildNumber: string = this.unknownStringValue;
  screenFrame: string = this.unknownStringValue;
  connection: string = this.unknownStringValue;
  fonts: string = this.unknownStringValue;
  domBlockers: string = this.unknownStringValue;
  fontPreferences: string = this.unknownStringValue;
  audioFingerprint: string = this.unknownStringValue;
  sessionStorage: string = this.unknownStringValue;
  localStorage: string = this.unknownStringValue;
  indexedDB: string = this.unknownStringValue;
  openDatabase: string = this.unknownStringValue;
  cpuClass: string = this.unknownStringValue;
  plugins: string = this.unknownStringValue;
  canvas: string = this.unknownStringValue;
  vendorFlavors: string = this.unknownStringValue;
  monochromeDepth: string = this.unknownStringValue;
  motionReduced: string = this.unknownStringValue;
  math: string = this.unknownStringValue;
  architecture: string = this.unknownStringValue;
  isPrivate: string = this.unknownStringValue;
  db: IndexDB | undefined;
  adBlockers: string = this.unknownStringValue;
  doNotTrack: string = this.unknownStringValue;
  navigatorPropertiesCount: string = this.unknownStringValue;
  buildID: string = this.unknownStringValue;
  javaEnabled: string = this.unknownStringValue;
  browserPermissions: string = this.unknownStringValue;
  supportedAudioFormats: string = this.unknownStringValue;
  supportedVideoFormats: string = this.unknownStringValue;
  audioContext: string = this.unknownStringValue;
  frequencyAnalyserProperties: string = this.unknownStringValue;
  battery: string = this.unknownStringValue;
  private dbName: string = this.unknownStringValue;
  private storeName: string = this.unknownStringValue;
  private cryptoKeyId: string = this.unknownStringValue;

  private api: FingerprintApi | null = null;
  public cloudDevice: Record<any, any> | null = null;
  constructor({
    environment = Environments.Production,
  }: { environment?: Environments } = {}) {
    this.hash = x64hash128;
    this.ezCrypto = new EZCrypto();
    this.api = new FingerprintApi({ environment });

    const isScriptRunnedInBrowser = isBrowser();
    if (!isScriptRunnedInBrowser) return;

    this.subtle = window.crypto.subtle;
    this.dbName = "fingerprint";
    this.storeName = "cookies";
    this.cryptoKeyId = "crypto-key";
    this.db = new IndexDB();
    this.screenColorDepth = paramToString(this.getColorDepth());
    this.colorGamut = paramToString(this.getColorGamut());
    this.contrastPreferences = paramToString(this.getContrastPreference());
    this.cookiesEnabled = paramToString(this.areCookiesEnabled());
    this.osInfo = paramToString(this.getOSInfo());
    this.deviceMemory = paramToString(this.getDeviceMemory());
    this.deviceColorsForced = paramToString(this.areColorsForced());
    this.hardwareConcurrency = paramToString(this.getHardwareConcurrency());
    this.usingHDR = paramToString(this.isHDR());
    this.colorsInverted = paramToString(this.areColorsInverted());
    this.languages = paramToString(this.getLanguages());
    this.osCpu = paramToString(this.getOsCpu());
    this.platform = paramToString(this.getPlatform());
    this.screenResolution = paramToString(this.getScreenResolution());
    this.timezone = paramToString(this.getTimezone());
    this.touchSupport = paramToString(JSON.stringify(this.getTouchSupport()));
    this.maxTouchPoints = paramToString(this.getTouchSupport().maxTouchPoints);
    this.gpu = paramToString(JSON.stringify(this.getVideoCardInfo()));
    this.gpuVendor = paramToString(this.getVideoCardInfo().vendor);
    this.gpuRenderer = paramToString(this.getVideoCardInfo().renderer);
    this.supportedAudioFormats = paramToString(this.getSupportedAudioFormats());

    this.navigator = this.getNavigatorValues();
    this.appName = paramToString(navigator.appName);
    this.appVersion = paramToString(navigator.appVersion);
    this.userAgent = paramToString(navigator.userAgent);
    this.pdfViewerEnabled = paramToString(navigator.pdfViewerEnabled);
    this.appCodeName = paramToString(navigator.appCodeName);
    this.product = paramToString(navigator.product);
    this.currentBrowserBuildNumber = paramToString(navigator.productSub);
    this.connection = paramToString(
      JSON.stringify(this.getConnectionParams(navigator))
    );
    this.doNotTrack = paramToString(
      this.handleDoNotTrackValue(navigator.doNotTrack)
    );
    this.navigatorPropertiesCount = paramToString(
      this.convertNavigatorToNumber(navigator)
    );
    this.buildID = paramToString(
      (navigator as any).buildID ? "Supported" : "Unsupported"
    );
    this.javaEnabled = paramToString(!!(navigator as any).enabled);
    this.sessionStorage = paramToString(this.getSessionStorage());
    this.localStorage = paramToString(this.getLocalStorage());
    this.indexedDB = paramToString(this.getIndexedDB());
    this.openDatabase = paramToString(this.getOpenDatabase());
    this.cpuClass = paramToString(this.getCpuClass());
    this.plugins = paramToString(this.getPlugins());
    this.canvas = paramToString(this.getCanvasFingerprint());
    this.vendorFlavors = paramToString(this.getVendorFlavors());
    this.monochromeDepth = paramToString(this.getMonochromeDepth());
    this.motionReduced = paramToString(this.isMotionReduced());
    this.math = paramToString(this.getMathFingerprint());
    this.architecture = paramToString(this.getArchitecture());
    this.audioContext = paramToString(this.getAudioContextProperties());
    this.frequencyAnalyserProperties = paramToString(
      this.getFrequencyAnalyserProperties()
    );
    this.supportedVideoFormats = paramToString(this.getSupportedVideoFormats());
  }

  public async local() {
    if (!this.api)
      throw new Error(
        "Configure api-key for using all functionality of Keyri Fingerprint"
      );
    const cryptocookie = await this.initCryptoCookie();
    const devicehash = this.createFingerprintHash();

    const { data: existedDevice } = await this.api?.getKnownDeviceData(
      devicehash,
      cryptocookie
    );

    return existedDevice;
  }

  public async generateEvent(eventParams: IEventParams) {
    if (!this.api)
      throw new Error(
        "Configure api-key for using all functionality of Keyri Fingerprint"
      );
    const cryptoCookie = await this.initCryptoCookie();
    const deviceHash = this.createFingerprintHash();

    return this.api.createEvent(eventParams, { deviceHash, cryptoCookie });
  }

  public async synchronizeDevice(): Promise<Record<any, any> | null> {
    try {
      if (!this.api)
        throw new Error(
          "Configure api-key for using all functionality of Keyri Fingerprint"
        );
      const cryptocookie = await this.initCryptoCookie();
      const deviceHash = this.createFingerprintHash();

      const { data: device } = await this.api.addNewDevice({
        deviceParams: this.getMainParams(),
        cryptocookie,
        deviceHash,
      });

      return device;
    } catch (err: any) {
      console.error("Error adding new cloud device: ", err.message);
      return null;
    }
  }

  private getConnectionParams(navigator: any): {
    downlink?: number;
    effectiveType?: string;
    rtt?: number;
  } {
    if (!isBrowser) return {};
    return {
      downlink: navigator.connection?.downlink,
      effectiveType: navigator.connection?.effectiveType,
      rtt: navigator.connection?.rtt,
    };
  }

  /**
   * 获取电池信息
   *
   * @returns Promise 对象，包含电池充电状态、充电时间、放电时间、电量百分比
   */
  private async getBatteryInfo(): Promise<{
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
  }> {
    try {
      // 调用浏览器的 getBattery 方法获取电池信息
      const battery = await (navigator as any).getBattery();
      // 返回电池信息，包括充电状态、充电时间、放电时间和电量百分比
      return {
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
        level: battery.level,
      };
    } catch (err: any) {
      // 捕获错误并打印错误信息
      console.error(err.message);
      // 返回一个默认值，表示电池未充电、充电时间、放电时间和电量百分比都为0
      return new Promise((resolve, reject) =>
        resolve({
          charging: false,
          chargingTime: 0,
          dischargingTime: 0,
          level: 0,
        })
      );
    }
  }

  /**
   * 获取音频分析器的属性
   *
   * @returns 音频分析器的属性对象
   */
  private getFrequencyAnalyserProperties(): Record<string, string | number> {
    try {
      // 创建一个音频上下文
      const audioCtx = new AudioContext();
      // 创建一个音频分析器
      const analyser = audioCtx.createAnalyser();

      // 设置FFT大小为2048
      analyser.fftSize = 2048;
      // 获取频率数据缓冲区长度
      const bufferLength = analyser.frequencyBinCount;
      // 创建一个长度为缓冲区长度的Uint8Array数组
      const dataArray = new Uint8Array(bufferLength);
      // 获取时域数据并填充到dataArray中
      analyser.getByteTimeDomainData(dataArray);

      // 返回音频分析器的属性
      return {
        channelCount: analyser.channelCount,
        channelCountMode: analyser.channelCountMode,
        channelInterpretation: analyser.channelInterpretation,
        fftSize: analyser.fftSize,
        frequencyBinCount: analyser.frequencyBinCount,
        maxDecibels: analyser.maxDecibels,
        minDecibels: analyser.minDecibels,
        numberOfInputs: analyser.numberOfInputs,
        numberOfOutputs: analyser.numberOfOutputs,
        smoothingTimeConstant: analyser.smoothingTimeConstant,
      };
    } catch (err: any) {
      // 捕获异常并打印错误信息
      console.error("Audio Context error: ", err.message);
      // 返回空对象
      return {};
    }
  }

  /**
   * 获取音频上下文属性
   *
   * @returns 音频上下文属性对象
   */
  private getAudioContextProperties(): Record<string, string | number> {
    // 如果不是浏览器环境，直接返回空对象
    if (!isBrowser()) return {};
    try {
      // 创建 AudioContext 对象
      const audioCtx = new AudioContext();
      // 创建 Oscillator 节点
      const oscillator = audioCtx.createOscillator();
      // 创建 Gain 节点
      const gainNode = audioCtx.createGain();

      // 将 Oscillator 节点连接到 Gain 节点
      oscillator.connect(gainNode);
      // 将 Gain 节点连接到 AudioContext 的目标节点
      gainNode.connect(audioCtx.destination);

      // 返回 AudioContext 的属性对象
      return {
        // Oscillator 节点的通道数
        channelCount: oscillator.channelCount,
        // Oscillator 节点的通道数模式
        channelCountMode: oscillator.channelCountMode,
        // Oscillator 节点的通道解释方式
        channelInterpretation: oscillator.channelInterpretation,
        // AudioContext 目标节点的最大通道数
        maxChannelCount: audioCtx.destination.maxChannelCount,
        // AudioContext 目标节点的输入数量
        numberOfInputs: audioCtx.destination.numberOfInputs,
        // AudioContext 目标节点的输出数量
        numberOfOutputs: audioCtx.destination.numberOfOutputs,
        // AudioContext 的采样率
        sampleRate: audioCtx.sampleRate,
        // AudioContext 的状态
        state: audioCtx.state,
      };
    } catch (err: any) {
      // 如果捕获到错误，打印错误信息，并返回空对象
      console.error("Audio Context Properties error: ", err.message);
      return {};
    }
  }

  /**
   * 获取浏览器支持的视频格式
   *
   * @returns 返回一个对象，该对象的键为视频格式，值为浏览器是否支持该视频格式
   */
  private getSupportedVideoFormats(): Record<string, string> {
    // 如果不是浏览器环境，直接返回空对象
    if (!isBrowser()) return {};

    // 定义支持的视频格式列表
    const formats = [
      'video/ogg; codecs="theora"',
      'video/mp4; codecs="avc1.42E01E"',
      'video/webm; codecs="vp8, vorbis"',
      'video/webm; codecs="vp9"',
      'application/x-mpegURL; codecs="avc1.42E01E"',
      'video/mp4; codecs="flac"',
      'video/ogg; codecs="opus"',
      'video/webm; codecs="vp9, Opus"',
    ];

    // 创建一个 video 元素
    const video = document.createElement("video");
    // 定义一个用于存储支持的视频格式的结果对象
    const resultSupport: Record<string, string> = {};

    // 遍历支持的视频格式列表
    formats.forEach(
      (format) => (resultSupport[format] = video.canPlayType(format))
    );

    // 返回结果对象
    return resultSupport;
  }

  /**
   * 获取支持的音频格式
   *
   * @returns 返回音频格式与其是否支持的映射关系
   */
  private getSupportedAudioFormats(): Record<string, string> {
    // 如果不是浏览器环境，直接返回空对象
    if (!isBrowser()) return {};

    const audioFormats = [
      "audio/aac",
      "audio/flac",
      "audio/mpeg",
      'audio/mp4; codecs="mp4a.40.2"',
      'audio/ogg; codecs="flac"',
      'audio/ogg; codecs="vorbis"',
      'audio/ogg; codecs="opus"',
      'audio/wav; codecs="1"',
      'audio/webm; codecs="vorbis"',
      'audio/webm; codecs="opus"',
    ];

    // 创建一个audio元素，以便使用canPlayType方法
    const audio = document.createElement("audio");
    const resultSupport: Record<string, string> = {};

    // 遍历audioFormats数组，将每个音频格式作为key，调用audio.canPlayType(format)的结果作为value存入resultSupport对象
    audioFormats.forEach(
      (format) => (resultSupport[format] = audio.canPlayType(format))
    );

    // 返回resultSupport对象，其中包含了所有音频格式及其对应的支持情况
    return resultSupport;
  }

  /**
   * 获取浏览器权限信息
   *
   * @returns 返回权限信息对象，若在非浏览器环境下则返回空对象
   */
  private async getBrowserPermissions(): Promise<
    Record<string, string> | undefined
  > {
    // 如果不是浏览器环境，则直接返回空对象
    if (!isBrowser) return {};
    try {
      // 定义一个权限列表
      const permissionsList = [
        "accelerometer",
        "camera",
        "clipboard-read",
        "clipboard-write",
        "geolocation",
        "background-sync",
        "magnetometer",
        "microphone",
        "midi",
        "notifications",
        "payment-handler",
        "persistent-storage",
      ];
      // 获取当前窗口的 navigator 对象
      const navigator = window.navigator;
      // 使用 Promise.allSettled 并发查询所有权限的状态
      const results = (
        await Promise.allSettled(
          permissionsList.map(async (name: string) => {
            // 查询每个权限的状态
            return navigator.permissions.query({ name: name as any });
          })
        )
      )
        // 过滤出成功查询的结果
        .filter((promiseResult) => promiseResult.status === "fulfilled")
        // 提取出权限的状态
        .map((promiseResult: any) => promiseResult.value);

      // 创建一个空对象用于存储权限及其状态
      const permissionsObject: any = {};
      // 遍历查询结果，将权限名称和状态存入对象
      results.forEach(
        (permission) => (permissionsObject[permission.name] = permission.state)
      );

      // 返回权限及其状态的对象
      return permissionsObject;
    } catch (err) {
      // 捕获异常，返回一个未定义的 Promise
      return new Promise((resolve, reject) => resolve(undefined));
    }
  }

  /**
   * 处理 Do Not Track 值
   *
   * @param value Do Not Track 值，可以为字符串或 null
   * @returns 如果值为 "yes" 或 "1"，则返回 true，否则返回 false
   */
  private handleDoNotTrackValue(value: string | null) {
    // 检查是否启用Do Not Track功能，可能返回的值有 "yes", "no", "unspecified", "1", "0", null
    if (value === "yes" || value === "1") {
      // 如果值为 "yes" 或 "1"，则返回 true，表示启用了Do Not Track功能
      return true;
    }
    // 其他情况返回 false，表示未启用Do Not Track功能
    return false;
  }

  /**
   * 将 Navigator 对象转换为数字
   *
   * @param navigator Navigator 对象
   * @returns 返回 Navigator 对象属性列表的长度
   */
  private convertNavigatorToNumber(navigator: Navigator) {
    // 定义一个函数，用于获取对象的所有属性
    function getAllProps(obj: any, props = []): Array<any> {
      // 如果对象的原型为null，说明已经遍历到了最顶层对象，返回已收集的属性列表
      if (Object.getPrototypeOf(obj) == null) {
        return props;
      }
      // 递归调用getAllProps函数，继续遍历对象的原型链，并将当前对象的属性名添加到属性列表中
      return getAllProps(
        Object.getPrototypeOf(obj),
        props.concat(Object.getOwnPropertyNames(obj) as any)
      );
    }

    // 调用getAllProps函数，传入navigator对象，并返回收集到的属性列表的长度
    return getAllProps(navigator).length;
  }

  /**
   * 获取预缓存的加密Cookie
   *
   * @returns 返回预缓存的加密Cookie，若不存在则返回null
   */
  private async getPreCachedCryptoCookie(): Promise<string | null> {
    try {
      // 判断当前脚本是否在浏览器中运行
      const isScriptRunnedInBrowser = isBrowser();
      // 如果不在浏览器中运行或者数据库对象不存在，则返回 null
      if (!isScriptRunnedInBrowser || !this.db) return null;
      // 创建一个只读事务
      const readTransaction = this.db.createTransaction(
        this.storeName,
        "readonly"
      );
      // 从数据库中获取已缓存的密钥
      let preCachedKey: any = await this.db?.getByKey(
        readTransaction,
        this.cryptoKeyId
      );
      // 如果已缓存的密钥中存在私钥，则返回私钥
      if (preCachedKey.privateKey) return preCachedKey.privateKey;
      // 如果数据库中未找到私钥，则从本地存储中获取私钥
      preCachedKey = localStorage.getItem(this.cryptoKeyId);
      // 返回私钥
      return preCachedKey;
    } catch (err) {
      // 如果捕获到异常，则从本地存储中获取私钥
      const localStorageKey = localStorage.getItem(this.cryptoKeyId);
      // 返回私钥
      return localStorageKey;
    }
  }

  /**
   * 使用广告屏蔽功能
   *
   * @returns 返回布尔值，表示是否成功屏蔽广告
   */
  private async adBlockUsing(): Promise<boolean> {
    // 如果不是浏览器环境，则返回false
    if (!isBrowser()) return false;
    // 获取body元素
    const body = document.querySelector("body");
    // 创建一个div元素
    // <div id="adTester" style="background-color: transparent; height: 1px; width: 1px;"></div>
    const adTag = document.createElement("div");
    // 设置div元素的id属性为'adTester'
    adTag.setAttribute("id", "adTester");
    // 设置div元素的样式属性
    adTag.setAttribute(
      "style",
      "background-color: transparent; height: 1px; width: 1px;"
    );
    // 将div元素添加到body元素的子节点中
    body!.appendChild(adTag);
    return new Promise((resolve, reject) => {
      const callback = async () => {
        // 获取id为'adTester'的div元素
        const adDivBlock = document.getElementById("adTester");
        // 如果div元素不存在或者其高度为0，则解析为true
        if (!adDivBlock || adDivBlock.clientHeight == 0) resolve(true);
        try {
          // 创建一个Request对象，请求指定的URL
          let test = new Request(
            "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
            { method: "HEAD", mode: "no-cors" }
          );

          // 发送fetch请求
          await fetch(test);
        } catch (err) {
          // 如果请求发生错误，则解析为true
          resolve(true);
        }
        // 无论请求是否成功，最后都解析为false
        resolve(false);
      };
      // 如果文档已经处于交互状态或完成状态，则立即执行回调函数
      if (
        document.readyState === "interactive" ||
        document.readyState === "complete"
      )
        return callback();
      // 否则，在文档加载完成后执行回调函数
      window.addEventListener("load", callback);
    });
  }

  /**
   * 从密钥对中获取Base64编码的公钥和私钥
   *
   * @param cryptoKey 密钥对
   * @returns 包含Base64编码的公钥和私钥的对象
   */
  private async getB64KeysFromKeyPair(cryptoKey: CryptoKeyPair) {
    // 从公钥获取Base64编码的字符串（使用SPKI格式）
    const publicKeyB64 = await this.getB64KeyFromCryptoKey(
      cryptoKey.publicKey,
      "spki"
    );
    // 从私钥获取Base64编码的字符串（使用PKCS8格式）
    const privateKeyB64 = await this.getB64KeyFromCryptoKey(
      cryptoKey.privateKey,
      "pkcs8"
    );

    // 返回包含公钥和私钥Base64编码的对象的键值对
    return { publicKeyB64, privateKeyB64 };
  }

  /**
   * 从加密密钥获取Base64编码的密钥
   *
   * @param cryptoKey 加密密钥
   * @param format 密钥格式，可选值为'spki'、'pkcs8'或'raw'
   * @returns 返回Base64编码的密钥
   * @throws 如果加密模块未初始化，则抛出错误
   */
  private async getB64KeyFromCryptoKey(
    cryptoKey: CryptoKey,
    format: "spki" | "pkcs8" | "raw"
  ) {
    // 如果subtle模块未初始化，则抛出错误
    if (!this.subtle) throw new Error("Crypto module is not initialized");

    // 根据给定的格式导出密钥数据
    const keyData = await this.subtle.exportKey(format, cryptoKey);

    // 将密钥数据转换为Uint8Array类型
    const keyBytes = new Uint8Array(keyData);

    // 将密钥字节转换为Base64编码的字符串
    const keyB64 = btoa(String.fromCharCode.apply(null, keyBytes as any));

    // 返回Base64编码的密钥
    return keyB64;
  }

  /**
   * 生成密钥对
   *
   * @returns 返回一个包含公钥和私钥的B64编码字符串
   * @throws 如果Crypto模块未初始化，则抛出错误
   */
  private async generateKeyPair() {
    // 如果subtle未初始化，则抛出错误
    if (!this.subtle) throw new Error("Crypto module is not initialized");

    // 生成ECDH密钥对
    const ECDHKey = await this.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );

    // 从密钥对获取Base64编码的密钥
    return this.getB64KeysFromKeyPair(ECDHKey);
  }

  /**
   * 从私钥获取公钥
   *
   * @param privateKey 私钥
   * @returns 返回公钥
   * @throws 如果 Crypto 模块未初始化，则抛出错误
   */
  private async getPublicKeyFromPrivate(privateKey: CryptoKey) {
    // 检查是否初始化了加密模块
    if (!this.subtle) throw new Error("Crypto module is not initialized");

    // 将私钥导出为 JWK 格式
    const jwkPrivate = await this.subtle.exportKey("jwk", privateKey);

    // 删除私钥中的 d 属性
    delete jwkPrivate.d;

    // 设置 JWK 对象的 key_ops 属性为 ['verify']
    jwkPrivate.key_ops = ["verify"];

    // 导入 JWK 格式的公钥，并设置相关参数
    return this.subtle.importKey(
      "jwk",
      jwkPrivate,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"]
    );
  }

  /**
   * 从私钥生成B64公钥
   *
   * @param privateKeyB64 私钥的B64编码
   * @returns 返回公钥的B64编码或null
   */
  private async generateB64PublicKeyFromPrivateKey(
    privateKeyB64: string
  ): Promise<string | null> {
    try {
      // 检查是否已初始化加密模块
      if (!this.subtle) throw new Error("Crypto module is not initialized");

      // 将base64字符串转换为ArrayBuffer
      const privateKeyArrayBuffer = base64StringToArrayBuffer(privateKeyB64);

      // 使用subtle.importKey方法导入私钥，并指定密钥格式为'pkcs8'，密钥算法为'ECDH'，使用曲线'P-256'，可提取，用于'deriveKey'操作
      const privateCryptoKey = await this.subtle.importKey(
        "pkcs8",
        privateKeyArrayBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey"]
      );

      // 从私钥获取公钥
      const publicCryptoKey = await this.getPublicKeyFromPrivate(
        privateCryptoKey
      );

      // 从公钥获取base64格式的密钥
      return this.getB64KeyFromCryptoKey(publicCryptoKey, "spki");
    } catch (err) {
      // 捕获异常，打印错误信息
      console.error("秘钥不正确");
      return null;
    }
  }

  /**
   * 初始化加密Cookie
   *
   * @returns 公钥字符串
   */
  async initCryptoCookie() {
    try {
      // 如果不是浏览器环境，则直接返回空字符串
      if (!isBrowser()) return "";
      // 如果数据库未初始化，则抛出错误
      if (!this.db) throw new Error("DB wasn`t initialized");

      // 获取预缓存的加密Cookie
      const preCachedKey = await this.getPreCachedCryptoCookie();
      // 如果预缓存的加密Cookie存在
      if (preCachedKey) {
        // 从私钥生成公钥
        const publicKey = await this.generateB64PublicKeyFromPrivateKey(
          preCachedKey
        );
        // 如果公钥存在，则返回公钥
        if (publicKey) return publicKey;
      }

      // 清除存储
      await this.clearStorages();
      // 生成密钥对
      const cryptoPair = await this.generateKeyPair();
      // 创建事务
      const transaction = this.db.createTransaction(
        this.storeName,
        "readwrite"
      );
      // 将私钥存储到数据库中
      await this.db?.put(transaction, {
        id: this.cryptoKeyId,
        privateKey: cryptoPair.privateKeyB64,
      });
      // 返回公钥
      return cryptoPair.publicKeyB64;
    } catch (err: any) {
      // 在控制台输出错误信息
      console.error(`在IndexDB中创建加密cookie时出错: ${err.message}`);
      // 生成密钥对
      const cryptoPair = await this.generateKeyPair();
      // 将私钥存储到本地存储中
      localStorage.setItem(this.cryptoKeyId, cryptoPair.privateKeyB64);
      // 返回公钥
      return cryptoPair.publicKeyB64;
    }
  }

  /**
   * 清除本地存储和指定存储区的数据
   *
   * @returns 无返回值
   */
  private async clearStorages(): Promise<undefined> {
    try {
      // 清除本地存储
      localStorage.clear();

      // 创建事务，用于读写数据库
      const store = await this.db?.createTransaction(
        this.storeName,
        "readwrite"
      );

      // 如果事务对象不存在，则直接返回
      if (!store) return;

      // 清除指定存储区的数据
      await this.db?.clearStore(store);
    } catch (err) {
      // 捕获错误并打印错误信息
      console.error("清除数据库时出错");
    }
  }

  private loadResult: Promise<any> | null = null;
  /**
   * 异步加载函数
   *
   * @returns 返回当前实例
   */
  async load() {
    const internalCall = async () => {
      try {
        // 获取存储名称
        const storeName = this.storeName;
        // 并发执行多个异步函数，并等待所有函数完成
        const [
          fonts,
          domBlockers,
          fontPreferences,
          audioFingerprint,
          screenFrame,
          incognitoMode,
          adBlockers,
          browserPermissions,
          battery,
          ...other
        ] = await Promise.all([
          this.getFonts(),
          this.getDomBlockers(),
          this.getFontPreferences(),
          this.getAudioFingerprint(),
          this.getRoundedScreenFrame(),
          this.isIncognitoMode(),
          this.adBlockUsing(),
          this.getBrowserPermissions(),
          this.getBatteryInfo(),
          // 连接数据库，如果不存在指定名称的对象存储，则创建一个
          this.db
            ?.connect(this.dbName, 1, function (this, event) {
              let db = this.result;
              if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "id" });
              }
            })
            .catch((err) => {
              console.error(
                "IndexDB not allowed in private mode: ",
                err.message
              );
            }),
        ]);

        // 将获取到的数据转换为字符串，并存储到对应的属性中
        this.battery = paramToString(battery);
        this.browserPermissions = paramToString(browserPermissions);
        this.adBlockers = paramToString(adBlockers);
        this.isPrivate = paramToString(incognitoMode.isIncognito);
        this.fonts = paramToString(fonts);
        this.domBlockers = paramToString(domBlockers);
        this.fontPreferences = paramToString(fontPreferences);
        this.audioFingerprint = paramToString(audioFingerprint);
        this.screenFrame = paramToString(screenFrame);

        // 如果存在 api，则调用 synchronizeDevice 方法同步设备信息
        if (this.api) {
          this.cloudDevice = await this.synchronizeDevice();
        }
        return this;
      } catch (err: any) {
        // 捕获错误并打印错误信息
        console.error(`Error load async params: ${err.message}`);
        return this;
      }
    };

    // 如果 loadResult 属性不存在，则执行 internalCall 函数，并将结果赋值给 loadResult
    if (!this.loadResult) this.loadResult = internalCall();
    // 返回 loadResult 属性值
    return this.loadResult;
  }

  /**
   * 生成指纹哈希值
   *
   * @returns 返回生成的指纹哈希值
   */
  createFingerprintHash(): string {
    // 如果指纹值不是未知字符串值，则直接返回指纹值
    if (this.fingerprint !== this.unknownStringValue) return this.fingerprint;

    // 将主要参数对象转换为规范字符串
    const nonHashedString = objectToCanonicalString(this.getMainParams());

    // 对规范字符串进行哈希计算
    const hash = this.hash(nonHashedString);

    // 将计算得到的哈希值赋给指纹值
    this.fingerprint = hash;

    // 返回计算得到的哈希值
    return hash;
  }

  /**
   * 获取主要参数
   *
   * @returns 返回一个字符串键值对组成的对象
   */
  getMainParams(): Record<string, string> {
    if (isNode()) return { environment: "node-js" };
    return {
      gpuVendor: this.gpuVendor,
      gpuRenderer: this.gpuRenderer,
      timezone: this.timezone,
      product: this.product,
      appName: this.appName,
      appCodeName: this.appCodeName,
      platform: this.platform,
      deviceMemory: this.deviceMemory,
      maxTouchPoints: this.maxTouchPoints,
      osInfo: this.osInfo,
      osCpu: this.osCpu,
      hardwareConcurrency: this.hardwareConcurrency,
      //screenFrame: this.screenFrame, ** 因为此字段取决于浏览器窗口的大小,不适合作为指纹属性
      screenColorDepth: this.screenColorDepth,
      colorGamut: this.colorGamut,
      currentBrowserBuildNumber: this.currentBrowserBuildNumber,
      appVersion: this.appVersion,
      fonts: this.fonts,
      domBlockers: this.domBlockers,
      fontPreferences: this.fontPreferences,
      screenResolution: this.screenResolution,
      contrastPreferences: this.contrastPreferences,
      cookiesEnabled: this.cookiesEnabled,
      languages: this.languages,
      userAgent: this.userAgent,
      pdfViewerEnabled: this.pdfViewerEnabled,
      deviceColorsForced: this.deviceColorsForced,
      usingHDR: this.usingHDR,
      colorsInverted: this.colorsInverted,
      audioFingerprint: this.audioFingerprint,
      sessionStorage: this.sessionStorage,
      localStorage: this.localStorage,
      indexedDB: this.indexedDB,
      openDatabase: this.openDatabase,
      cpuClass: this.cpuClass,
      plugins: this.plugins,
      vendorFlavors: this.vendorFlavors,
      monochromeDepth: this.monochromeDepth,
      motionReduced: this.motionReduced,
      math: this.math,
      architecture: this.architecture,
      adBlockers: this.adBlockers,
      doNotTrack: this.doNotTrack,
      navigatorPropertiesCount: this.navigatorPropertiesCount,
      buildID: this.buildID,
      javaEnabled: this.javaEnabled,
      browserPermissions: this.browserPermissions,
      supportedAudioFormats: this.supportedAudioFormats,
      audioContext: this.audioContext,
      frequencyAnalyserProperties: this.frequencyAnalyserProperties,
      supportedVideoFormats: this.supportedVideoFormats,
      // canvas: this.canvas, 移动设备渲染相同图片时存在差异
      // isPrivate: this.isPrivate, 同设备也会有不同结果
      // battery: this.battery, 同设备也会有不同结果
      // connection: this.connection, 需要联网，暂不考虑
    };
  }

  /**
   * 获取当前系统的架构信息，返回值为数字类型。
   *
   * @returns 当前系统的架构信息
   */
  private getArchitecture(): number {
    // 创建一个长度为1的Float32Array数组
    const f = new Float32Array(1);
    // 创建一个与f共享同一块内存的Uint8Array数组
    const u8 = new Uint8Array(f.buffer);
    // 将f的第一个元素设置为正无穷大
    f[0] = Infinity;
    // 计算f的第一个元素减去它自身，结果为NaN（Not a Number）
    f[0] = f[0] - f[0];

    // 返回u8数组的第四个元素（索引为3），该元素为127（代表IEEE 754标准中的NaN的符号位）
    return u8[3];
  }

  /**
   * 获取数学函数指纹
   *
   * @returns 数学函数指纹对象
   */
  private getMathFingerprint(): Record<string, number> {
    const M = Math;
    const fallbackFn = () => 0;
    const acos = M.acos || fallbackFn;
    const acosh = M.acosh || fallbackFn;
    const asin = M.asin || fallbackFn;
    const asinh = M.asinh || fallbackFn;
    const atanh = M.atanh || fallbackFn;
    const atan = M.atan || fallbackFn;
    const sin = M.sin || fallbackFn;
    const sinh = M.sinh || fallbackFn;
    const cos = M.cos || fallbackFn;
    const cosh = M.cosh || fallbackFn;
    const tan = M.tan || fallbackFn;
    const tanh = M.tanh || fallbackFn;
    const exp = M.exp || fallbackFn;
    const expm1 = M.expm1 || fallbackFn;
    const log1p = M.log1p || fallbackFn;

    const powPI = (value: number) => M.pow(M.PI, value);
    const acoshPf = (value: number) => M.log(value + M.sqrt(value * value - 1));
    const asinhPf = (value: number) => M.log(value + M.sqrt(value * value + 1));
    const atanhPf = (value: number) => M.log((1 + value) / (1 - value)) / 2;
    const sinhPf = (value: number) => M.exp(value) - 1 / M.exp(value) / 2;
    const coshPf = (value: number) => (M.exp(value) + 1 / M.exp(value)) / 2;
    const expm1Pf = (value: number) => M.exp(value) - 1;
    const tanhPf = (value: number) =>
      (M.exp(2 * value) - 1) / (M.exp(2 * value) + 1);
    const log1pPf = (value: number) => M.log(1 + value);

    return {
      acos: acos(0.123124234234234242),
      acosh: acosh(1e308),
      acoshPf: acoshPf(1e154),
      asin: asin(0.123124234234234242),
      asinh: asinh(1),
      asinhPf: asinhPf(1),
      atanh: atanh(0.5),
      atanhPf: atanhPf(0.5),
      atan: atan(0.5),
      sin: sin(-1e300),
      sinh: sinh(1),
      sinhPf: sinhPf(1),
      cos: cos(10.000000000123),
      cosh: cosh(1),
      coshPf: coshPf(1),
      tan: tan(-1e300),
      tanh: tanh(1),
      tanhPf: tanhPf(1),
      exp: exp(1),
      expm1: expm1(1),
      expm1Pf: expm1Pf(1),
      log1p: log1p(10),
      log1pPf: log1pPf(10),
      powPI: powPI(-100),
    };
  }

  /**
   * 获取单色深度
   *
   * @returns 返回表示单色深度的字符串或数字，或者如果浏览器不支持单色模式，则返回 undefined
   */
  private getMonochromeDepth(): string | number | undefined {
    // 设置要检查的最大值
    const maxValueToCheck = 100;

    // 如果设备不支持单色显示，则返回undefined
    if (!matchMedia("(min-monochrome: 0)").matches) {
      return undefined;
    }

    // 从0开始逐个检查单色深度
    for (let i = 0; i <= maxValueToCheck; ++i) {
      // 如果当前单色深度匹配成功
      if (matchMedia(`(max-monochrome: ${i})`).matches) {
        // 返回当前单色深度
        return i;
      }
    }

    // 如果最大单色深度都匹配不成功，则返回"Too high value"
    return "Too high value";
  }

  /**
   * 获取供应商数组
   *
   * @returns 供应商数组
   */
  private getVendorFlavors(): string[] {
    // 创建一个空数组用于存储满足条件的vendorFlavorKeys
    const flavors: string[] = [];

    // 遍历vendorFlavorKeys数组
    for (const key of vendorFlavorKeys) {
      // 获取当前key对应的值
      const value = (window as unknown as Record<string, unknown>)[key];
      // 如果值存在且类型为对象
      if (value && typeof value === "object") {
        // 将当前key添加到flavors数组中
        flavors.push(key);
      }
    }

    // 对flavors数组进行排序并返回
    return flavors.sort();
  }

  /**
   * 判断是否减少了运动
   *
   * @returns 如果减少了运动，则返回true；如果没有偏好，则返回false；如果没有匹配到任何值，则返回undefined
   */
  private isMotionReduced(): boolean | undefined {
    // 匹配'prefers-reduced-motion'生成器
    const doesMatch = matchGenerator("prefers-reduced-motion");

    // 如果匹配到'reduce'，则返回true
    if (doesMatch("reduce")) {
      return true;
    }

    // 如果匹配到'no-preference'，则返回false
    if (doesMatch("no-preference")) {
      return false;
    }

    // 如果没有匹配到任何值，则返回undefined
    return undefined;
  }

  /**
 * 获取画布指纹信息
 *
 * @returns 画布指纹信息
 */
  private getCanvasFingerprint(): CanvasFingerprint {
    // 是否支持逆时针渲染
    let winding = false;
    // 几何图像
    let geometry: string;
    // 文本图像
    let text: string;

    const [canvas, context] = makeCanvasContext();
    if (!isSupported(canvas, context)) {
      // 如果不支持，则几何图像和文本图像都为空字符串
      geometry = text = ""; // The value will be 'unsupported' in v3.4
    } else {
      // 判断是否支持逆时针渲染
      winding = doesSupportWinding(context);

      // 渲染文本图像
      renderTextImage(canvas, context);
      // 将画布转换为字符串
      const textImage1 = canvasToString(canvas);
      // 将画布再次转换为字符串，这样可以稍微提高速度
      const textImage2 = canvasToString(canvas); // It's slightly faster to double-encode the text image

      // 有些浏览器会在画布上添加噪声，因此这种情况下画布将不被包含在指纹中
      if (textImage1 !== textImage2) {
        // 如果两次转换得到的字符串不一致，说明画布不稳定，因此几何图像和文本图像都为'unstable'
        geometry = text = "unstable";
      } else {
        // 否则，文本图像为第一次转换得到的字符串
        text = textImage1;

        // 文本图像不稳定：https://github.com/fingerprintjs/fingerprintjs/issues/583
        // 因此将其提取到单独的图像中
        renderGeometryImage(canvas, context);
        // 将画布转换为字符串作为几何图像
        geometry = canvasToString(canvas);
      }
    }

    // 返回包含逆时针渲染、几何图像和文本图像的指纹对象
    return { winding, geometry, text };
  }


  /**
 * 获取可用字体列表
 *
 * @returns 返回一个包含可用字体名称的字符串数组，或者 undefined
 */
  private getFonts(): Promise<string[] | undefined> {
    try {
      return withIframe((_, { document }) => {
        const holder = document.body;
        holder.style.fontSize = textSizeForFontInfo;
        const spansContainer = document.createElement("div");
        const defaultWidth: Partial<Record<string, number>> = {};
        const defaultHeight: Partial<Record<string, number>> = {};
        const createSpan = (fontFamily: string) => {
          const span = document.createElement("span");
          const { style } = span;
          style.position = "absolute";
          style.top = "0";
          style.left = "0";
          style.fontFamily = fontFamily;
          span.textContent = testFontString;
          spansContainer.appendChild(span);
          return span;
        };
        const createSpanWithFonts = (
          fontToDetect: string,
          baseFont: string
        ) => {
          return createSpan(`'${fontToDetect}',${baseFont}`);
        };
        const initializeBaseFontsSpans = () => {
          return baseFonts.map(createSpan);
        };
        const initializeFontsSpans = () => {
          const spans: Record<string, HTMLSpanElement[]> = {};
          for (const font of fontList) {
            spans[font] = baseFonts.map((baseFont) =>
              createSpanWithFonts(font, baseFont)
            );
          }
          return spans;
        };
        const isFontAvailable = (fontSpans: HTMLElement[]) => {
          return baseFonts.some(
            (baseFont, baseFontIndex) =>
              fontSpans[baseFontIndex].offsetWidth !== defaultWidth[baseFont] ||
              fontSpans[baseFontIndex].offsetHeight !== defaultHeight[baseFont]
          );
        };
        const baseFontsSpans = initializeBaseFontsSpans();
        const fontsSpans = initializeFontsSpans();
        holder.appendChild(spansContainer);
        for (let index = 0; index < baseFonts.length; index++) {
          defaultWidth[baseFonts[index]] = baseFontsSpans[index].offsetWidth; 
          defaultHeight[baseFonts[index]] = baseFontsSpans[index].offsetHeight; 
        }
        return fontList.filter((font) => isFontAvailable(fontsSpans[font]));
      });
    } catch (err) {
      return new Promise((resolve, reject) => resolve(undefined));
    }
  }

  /**
 * 判断当前浏览器是否支持打开WebSQL数据库
 *
 * @returns 如果支持打开WebSQL数据库，则返回true；否则返回false
 */
  private getOpenDatabase(): boolean {
    // 检查全局对象 window 是否存在 openDatabase 属性，并判断其是否为 truthy 值（即不为 null、undefined、false、0、空字符串等）
    return !!(window as any).openDatabase;
  }


  /**
 * 获取是否支持IndexedDB
 *
 * @returns 如果支持IndexedDB则返回true，不支持则返回undefined
 */
  private getIndexedDB(): boolean | undefined {
    // 如果浏览器是IE或Edge，则不允许在隐私模式下访问indexedDB，因此IE和Edge在正常模式和隐私模式下的visitor标识符会不同。
    if (isTrident() || isEdgeHTML()) {
      return undefined;
    }
    try {
      // 尝试访问window.indexedDB，如果访问成功则返回true，否则返回false。
      return !!window.indexedDB;
    } catch (e) {
      /* 引用时发生SecurityError错误表示它存在 */
      return true;
    }
  }


/**
 * 获取当前浏览器是否支持sessionStorage
 *
 * @returns 如果支持sessionStorage则返回true，否则返回false
 */
  private getSessionStorage(): boolean {
    try {
      return !!window.sessionStorage;
    } catch (error) {
      return true;
    }
  }

  /**
 * 获取本地存储是否可用
 *
 * @returns 如果本地存储可用，则返回true；否则返回false
 */
  private getLocalStorage(): boolean {
    try {
      return !!window.localStorage;
    } catch (e) {
      return true;
    }
  }

  /**
 * 获取 DOM 阻塞器的函数
 *
 * @returns 返回包含字符串数组或 undefined 的 Promise
 */
  private async getDomBlockers(): Promise<string[] | undefined> {
    try {
      if (!this.isDomBlockersApplicable()) {
        return [];
      }

      const filters = getFilters();
      const filterNames = Object.keys(filters) as Array<keyof typeof filters>;
      const allSelectors = ([] as string[]).concat(
        ...filterNames.map((filterName) => filters[filterName])
      );
      const blockedSelectors = await this.getBlockedSelectors(allSelectors);

      const activeBlockers = filterNames.filter((filterName) => {
        const selectors = filters[filterName];
        const blockedCount = countTruthy(
          selectors.map((selector) => blockedSelectors[selector])
        );
        return blockedCount > selectors.length * 0.6;
      });
      activeBlockers.sort();

      return activeBlockers;
    } catch (err) {
      return new Promise((resolve, reject) => resolve(undefined));
    }
  }

  /**
 * 判断是否适用于 DOM 阻塞器
 *
 * @returns 是否适用于 DOM 阻塞器，返回值为布尔类型
 */
  private isDomBlockersApplicable(): boolean {
    // Safari (desktop and mobile) and all Android browsers keep content blockers in both regular and private mode
    return isWebKit() || isAndroid();
  }

  /**
 * 获取被阻塞的选择器列表
 *
 * @param selectors 选择器列表
 * @returns 返回一个对象，其中每个键为选择器，值为true表示该选择器被阻塞
 */
  private async getBlockedSelectors<T extends string>(
    selectors: readonly T[]
  ): Promise<{ [K in T]?: true }> {
    const d = document;
    const root = d.createElement("div");
    const elements = new Array<HTMLElement>(selectors.length);
    const blockedSelectors: { [K in T]?: true } = {}; // Set() isn't used just in case somebody need older browser support

    this.forceShowSelector(root);

    // First create all elements that can be blocked. If the DOM steps below are done in a single cycle,
    // browser will alternate tree modification and layout reading, that is very slow.
    for (let i = 0; i < selectors.length; ++i) {
      const element = selectorToElement(selectors[i]);
      const holder = d.createElement("div"); // Protects from unwanted effects of `+` and `~` selectors of filters
      this.forceShowSelector(holder);
      holder.appendChild(element);
      root.appendChild(holder);
      elements[i] = element;
    }

    // document.body can be null while the page is loading
    while (!d.body) {
      await wait(50);
    }
    d.body.appendChild(root);

    try {
      // Then check which of the elements are blocked
      for (let i = 0; i < selectors.length; ++i) {
        if (!elements[i].offsetParent) {
          blockedSelectors[selectors[i]] = true;
        }
      }
    } finally {
      // Then remove the elements
      root.parentNode?.removeChild(root);
    }

    return blockedSelectors;
  }

  /**
 * 强制显示选择器
 *
 * @param element 要显示的 HTML 元素
 */
  private forceShowSelector(element: HTMLElement) {
    // 设置元素的 display 属性为 block，并添加 !important 优先级
    element.style.setProperty("display", "block", "important");
  }

  /**
 * 获取字体偏好设置
 *
 * @returns 返回包含所有字体偏好设置的 Promise 对象，该对象是一个 Record 类型，键为字符串，值为数字，表示字体大小和偏好设置。如果获取失败，则返回 undefined。
 */
  private async getFontPreferences(): Promise<
  Record<string, number> | undefined
> {
  try {
    // 使用 withNaturalFonts 方法处理，确保在特定的自然字体环境下执行代码
    return this.withNaturalFonts((document, container) => {
      // 用于存储创建的 HTML 元素
      const elements: Record<string, HTMLElement> = {};
      // 用于存储每个元素的宽度
      const sizes: Record<string, number> = {};

      // 首先创建所有需要测量的元素
      // 如果下面的 DOM 操作在一个循环中完成，浏览器会交替执行树修改和布局读取，这非常慢
      for (const key of Object.keys(fontsPreferencesPresets)) {
        const [style = {}, text = defaultPresetText] =
          fontsPreferencesPresets[key];

        // 创建 span 元素
        const element = document.createElement("span");
        element.textContent = text;
        element.style.whiteSpace = "nowrap";

        // 将样式对象中的属性应用到元素上
        for (const name of Object.keys(style) as Array<keyof typeof style>) {
          const value = style[name];
          if (value !== undefined) {
            element.style[name] = value;
          }
        }

        // 将元素存储在 elements 对象中
        elements[key] = element;
        // 在容器中添加换行元素
        container.appendChild(document.createElement("br"));
        // 在容器中添加创建的元素
        container.appendChild(element);
      }

      // 然后测量创建的元素的宽度
      // Then measure the created elements
      for (const key of Object.keys(fontsPreferencesPresets)) {
        sizes[key] = elements[key].getBoundingClientRect().width;
      }

      // 返回元素宽度的记录
      return sizes;
    });
  } catch (err) {
    // 捕获异常，返回一个未定义的 Promise
    return new Promise((resolve, reject) => resolve(undefined));
  }
}



  /**
 * 使用自然字体运行函数
 *
 * @param action 需要执行的函数，参数为 document 和 container，返回值为 MaybePromise<T>
 * @param containerWidthPx 容器宽度，默认为 4000
 * @returns 返回一个 Promise<T>
 */
  private async withNaturalFonts<T>(
    // 传入一个函数作为参数，该函数接收两个参数：document和container，返回一个可能是Promise的T类型值
    action: (document: Document, container: HTMLElement) => MaybePromise<T>,
    // 容器宽度默认值为4000像素
    containerWidthPx = 4000
  ): Promise<T> {
    // 使用withIframe函数，传入一个回调函数和HTML模板字符串作为参数
    return withIframe((_, iframeWindow) => {
      // 获取iframe中的document和body元素
      const iframeDocument = iframeWindow.document;
      const iframeBody = iframeDocument.body;
  
      // 获取body的样式并设置宽度
      const bodyStyle = iframeBody.style;
      bodyStyle.width = `${containerWidthPx}px`;
      // 设置文本大小调整属性为none，忽略webkit内核的特定样式设置
      // @ts-ignore
      bodyStyle.webkitTextSizeAdjust = bodyStyle.textSizeAdjust = "none";
  
      // 判断浏览器类型
      if (isChromium()) {
        // 如果是Chromium内核浏览器，设置缩放比例为设备像素比例的倒数
        // @ts-ignore
        iframeBody.style.zoom = `${1 / iframeWindow.devicePixelRatio}`;
      } else if (isWebKit()) {
        // 如果是WebKit内核浏览器，将缩放比例重置为默认值
        // @ts-ignore
        iframeBody.style.zoom = "reset";
      }
  
      // 创建一个div元素，用于测试文本行宽
      const linesOfText = iframeDocument.createElement("div");
      // 设置div的文本内容为一定数量的"word"单词，单词数量根据容器宽度计算得出
      linesOfText.textContent = [...Array((containerWidthPx / 20) << 0)]
        .map(() => "word")
        .join(" ");
      // 将div元素添加到body中
      iframeBody.appendChild(linesOfText);
  
      // 调用传入的action函数，并传入iframe的document和body作为参数
      return action(iframeDocument, iframeBody);
    // HTML模板字符串，定义iframe的HTML结构
    }, '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">');
  }
  
  
  /**
   * 获取音频指纹
   *
   * @returns 返回一个Promise，解析为number类型的音频指纹
   */
  private async getAudioFingerprint(): Promise<number> {
    try {
      const w = window;
      const AudioContext =
        w.OfflineAudioContext || (w as any).webkitOfflineAudioContext;

      //在某些浏览器中，除非上下文是响应用户操作而启动的，否则音频上下文始终处于挂起状态
      //（例如点击或轻击）。它可以防止在任意时刻获取音频指纹。
      //这样的浏览器既旧又不受欢迎，所以音频指纹在其中被跳过了。

      // 判断当前环境是否支持 AudioContext
      if (!AudioContext) {
        return SpecialFingerprint.NotSupported;
      }

      // 判断当前浏览器是否已知会挂起 AudioContext
      if (this.doesCurrentBrowserSuspendAudioContext()) {
        return SpecialFingerprint.KnownToSuspend;
      }

      // 设置音频哈希的起始和结束索引
      const hashFromIndex = 4500;
      const hashToIndex = 5000;

      // 创建 AudioContext，设置通道数、长度和采样率
      const context = new AudioContext(1, hashToIndex, 44100);

      // 创建振荡器并设置类型为三角波，频率为 10000
      const oscillator = context.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.value = 10000;

      // 创建压缩器并设置参数
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;

      // 将振荡器连接到压缩器，再将压缩器连接到音频输出
      oscillator.connect(compressor);
      compressor.connect(context.destination);

      // 启动振荡器
      oscillator.start(0);

      // 开始渲染音频，并获取渲染完成的 Promise 和结束渲染的回调
      const [renderPromise, finishRendering] =
        this.startRenderingAudio(context);

      // 获取音频哈希值的 Promise，处理渲染成功和失败的情况
      const fingerprintPromise = renderPromise.then(
        (buffer) =>
          this.getAudioHash(buffer.getChannelData(0).subarray(hashFromIndex)),
        (error) => {
          if (
            error.name === InnerErrorName.Timeout ||
            error.name === InnerErrorName.Suspended
          ) {
            return SpecialFingerprint.Timeout;
          }
          throw error;
        }
      );

      // 抑制未处理的拒绝警告
      suppressUnhandledRejectionWarning(fingerprintPromise);

      // 等待渲染完成
      await finishRendering();

      // 返回音频哈希值的 Promise
      return fingerprintPromise;
    } catch (err) {
      // 捕获异常，返回一个始终解析为 0 的 Promise
      return new Promise((resolve, reject) => resolve(0));
    }
  }

  /**
   * 开始渲染音频
   *
   * @param context 离线音频上下文
   * @returns 返回一个包含 Promise<AudioBuffer> 和 finalize 函数的元组
   */
  private startRenderingAudio(context: OfflineAudioContext) {
    // 尝试渲染的最大次数
    const renderTryMaxCount = 3;
    // 重试渲染的延迟时间
    const renderRetryDelay = 500;
    // 运行的最大等待时间
    const runningMaxAwaitTime = 500;
    // 运行的足够时间
    const runningSufficientTime = 5000;
    // 结束函数
    let finalize = () => undefined as void;

    const resultPromise = new Promise<AudioBuffer>((resolve, reject) => {
      // 是否已结束
      let isFinalized = false;
      // 尝试渲染的次数
      let renderTryCount = 0;
      // 开始运行的时间
      let startedRunningAt = 0;

      // 渲染完成时执行的回调函数
      context.oncomplete = (event) => resolve(event.renderedBuffer);

      // 启动运行超时的函数
      const startRunningTimeout = () => {
        setTimeout(
          // 如果已结束或超过了足够时间，则拒绝Promise
          () => reject(this.makeInnerError(InnerErrorName.Timeout)),
          Math.min(
            runningMaxAwaitTime,
            startedRunningAt + runningSufficientTime - Date.now()
          )
        );
      };

      // 尝试渲染的函数
      const tryRender = () => {
        try {
          // 开始渲染
          context.startRendering();

          // 根据渲染的状态进行处理
          switch (context.state) {
            case "running":
              // 记录开始运行的时间
              startedRunningAt = Date.now();
              // 如果已结束，则启动运行超时的函数
              if (isFinalized) {
                startRunningTimeout();
              }
              break;
            case "suspended":
              // 如果文档未隐藏，则增加尝试渲染的次数
              if (!document.hidden) {
                renderTryCount++;
              }
              // 如果已结束且尝试渲染的次数达到最大值，则拒绝Promise
              if (isFinalized && renderTryCount >= renderTryMaxCount) {
                reject(this.makeInnerError(InnerErrorName.Suspended));
              } else {
                // 等待一段时间后再次尝试渲染
                setTimeout(tryRender, renderRetryDelay);
              }
              break;
          }
        } catch (error) {
          // 如果发生错误，则拒绝Promise
          reject(error);
        }
      };

      // 开始尝试渲染
      tryRender();

      // 结束函数
      finalize = () => {
        // 如果未结束，则标记为已结束
        if (!isFinalized) {
          isFinalized = true;
          // 如果已开始运行，则启动运行超时的函数
          if (startedRunningAt > 0) {
            startRunningTimeout();
          }
        }
      };
    });

    // 返回Promise和结束函数
    return [resultPromise, finalize] as const;
  }

  /**
   * 计算音频信号的哈希值
   *
   * @param signal 音频信号数组
   * @returns 哈希值
   */
  private getAudioHash(signal: ArrayLike<number>): number {
    // 初始化哈希值为0
    let hash = 0;
    // 遍历信号数组
    for (let i = 0; i < signal.length; ++i) {
      // 将信号值取绝对值并累加到哈希值中
      hash += Math.abs(signal[i]);
    }
    // 返回计算得到的哈希值
    return hash;
  }

  /**
 * 创建内部错误对象
 *
 * @param name 内部错误名称
 * @returns 返回创建的Error对象
 */
  private makeInnerError(name: InnerErrorName) {
    // 创建一个新的Error对象，传入参数name作为错误信息
    const error = new Error(name);
    // 设置Error对象的name属性为传入的参数name
    error.name = name;
    // 返回创建的Error对象
    return error;
  }


  /**
 * 判断当前浏览器是否会挂起 AudioContext
 *
 * @returns 如果当前浏览器为 WebKit 内核且不是桌面版的 Safari 浏览器且不是 WebKit 606 或更高版本，则返回 true，否则返回 false
 */
  private doesCurrentBrowserSuspendAudioContext() {
    // 判断当前浏览器是否为 WebKit 内核
    return isWebKit() &&
      // 并且不是桌面版的 Safari 浏览器
      !isDesktopSafari() &&
      // 并且不是 WebKit 606 或更高版本
      !isWebKit606OrNewer();
  }

  /**
 * 获取显卡信息
 *
 * @returns 返回显卡信息对象，包含显卡厂商和渲染器信息，如果获取不到webgl上下文或扩展信息，则返回错误信息
 */
  private getVideoCardInfo(): IGetVideoCardInfo {
    // 创建一个canvas元素并获取其webgl上下文
    const gl = document.createElement("canvas").getContext("webgl");
    // 如果获取不到webgl上下文，则返回错误信息
    if (!gl)
      return {
        error: "No webgl",
      };

    // 获取webgl的扩展信息
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    // 如果获取到了扩展信息，则返回显卡厂商和渲染器信息
    return debugInfo
      ? {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
      }
      // 如果获取不到扩展信息，则返回错误信息
      : {
        error: "No WEBGL_debug_renderer_info",
      };
  }


  /**
 * 获取屏幕的色深
 *
 * @returns 屏幕的色深，单位为比特
 */
  private getColorDepth(): number {
    // 返回屏幕的色深
    return window.screen.colorDepth;
  }

  /**
 * 获取颜色色域
 *
 * @returns 返回色域名称，若不支持则返回undefined
 */
  private getColorGamut(): string | undefined {
    // rec2020包括p3，p3包括srgb
    for (const gamut of ["rec2020", "p3", "srgb"]) {
      // 判断当前设备的颜色范围是否支持指定的颜色范围
      if (matchMedia(`(color-gamut: ${gamut})`).matches) {
        // 如果支持，则返回对应的颜色范围
        return gamut;
      }
    }
    // 如果都不支持，则返回undefined
    return undefined;
  }

  /**
 * 获取颜色色域
 *
 * @returns 返回色域名称，若不支持则返回undefined
 */
  private getContrastPreference(): number | undefined {
    // 调用 matchGenerator 函数生成匹配器
    const doesMatch = matchGenerator("prefers-contrast");

    // 如果匹配到 "no-preference"
    if (doesMatch("no-preference")) {
      // 返回 ContrastPreference.None
      return ContrastPreference.None;
    }
    // 如果匹配到 "high" 或 "more"
    if (doesMatch("high") || doesMatch("more")) {
      // 返回 ContrastPreference.More
      return ContrastPreference.More;
    }
    // 如果匹配到 "low" 或 "less"
    if (doesMatch("low") || doesMatch("less")) {
      // 返回 ContrastPreference.Less
      return ContrastPreference.Less;
    }
    // 如果匹配到 "forced"
    if (doesMatch("forced")) {
      // 返回 ContrastPreference.ForcedColors
      return ContrastPreference.ForcedColors;
    }
    // 如果没有匹配到任何情况
    return undefined;
  }
  private areCookiesEnabled(): boolean {
    // 检测是否启用了cookies
    // navigator.cookieEnabled 无法检测到自定义或细致的cookie阻止配置。例如，在IE9中通过高级隐私设置阻止cookies时，它总是返回true。
    // 过去也曾出现与站点特定异常相关的问题。不要依赖它。
    try {
      // 创建cookie
      // Create cookie
      document.cookie = 'cookietest=1; SameSite=Strict;';
      const result = document.cookie.indexOf('cookietest=') !== -1;
      // 删除cookie
      // Delete cookie
      document.cookie = 'cookietest=1; SameSite=Strict; expires=Thu, 01-Jan-1970 00:00:01 GMT';
      return result;
    } catch (e) {
      return false;
    }
  }

  /**
 * 获取当前操作系统信息
 *
 * @returns 返回操作系统架构信息，为字符串类型，包含"x64"或"x86"
 */
  private getOSInfo(): string {
    // 获取操作系统的架构信息
    const arch =
      // 如果用户代理字符串中包含x86_64、Win64、WOW64中的任意一个
      navigator.userAgent.match(/x86_64|Win64|WOW64/) ||
        // 或者通过非标准方式获取到cpuClass为x64
        (navigator as any).cpuClass === "x64"
        // 则返回"x64"
        ? "x64"
        // 否则返回"x86"
        : "x86";
    // 返回操作系统的架构信息
    return arch;
  }

  /**
 * 获取 CPU 类型
 *
 * @returns 返回 CPU 类型字符串，如果不存在则返回 undefined
 */
  private getCpuClass(): string | undefined {
    return (navigator as any).cpuClass;
  }


  /**
 * 获取导航对象
 *
 * @returns 导航对象
 */
  private getNavigatorValues(): Navigator {
    return navigator;
  }

  /**
 * 获取设备内存大小（单位：GB）
 *
 * @returns 返回设备内存大小，如果获取失败则返回undefined
 */
  private getDeviceMemory(): number | undefined {
    // `navigator.deviceMemory` 在某些未识别的情况下是一个包含数字的字符串
    return replaceNaN(toFloat((navigator as any).deviceMemory), undefined);
  }

  /**
 * 检查是否强制使用颜色。
 *
 * @returns 如果强制使用颜色，则返回 true；如果未强制使用颜色，则返回 false；如果无法确定，则返回 undefined。
 */
  private areColorsForced(): boolean | undefined {
    // 检查是否匹配 "forced-colors"
    const doesMatch = matchGenerator("forced-colors");

    // 如果匹配 "active"，则返回 true
    if (doesMatch("active")) {
      return true;
    }

    // 如果匹配 "none"，则返回 false
    if (doesMatch("none")) {
      return false;
    }

    // 如果没有匹配到任何情况，则返回 undefined
    return undefined;
  }

  /**
 * 获取硬件并发数
 *
 * @returns 返回硬件并发数，如果获取失败则返回undefined
 */
  private getHardwareConcurrency(): number | undefined {
    // 有时硬件并发量是一个字符串
    return replaceNaN(toInt(navigator.hardwareConcurrency), undefined);
  }


  /**
 * 判断当前是否是HDR模式
 *
 * @returns 如果当前是HDR模式，返回true；如果当前是标准模式，返回false；否则返回undefined
 */
  private isHDR(): boolean | undefined {
    const doesMatch = matchGenerator("dynamic-range");
    if (doesMatch("high")) {
      return true;
    }
    if (doesMatch("standard")) {
      return false;
    }
    return undefined;
  }

  /**
 * 判断颜色是否反转
 *
 * @returns 返回一个布尔值或undefined，表示颜色是否反转
 */
  private areColorsInverted(): boolean | undefined {
    // 调用 matchGenerator 函数生成匹配器
    const doesMatch = matchGenerator("inverted-colors");

    // 如果匹配到 "inverted"，则返回 true
    if (doesMatch("inverted")) {
      return true;
    }

    // 如果匹配到 "none"，则返回 false
    if (doesMatch("none")) {
      return false;
    }

    // 如果没有匹配到任何情况，则返回 undefined
    return undefined;
  }

  /**
 * 获取浏览器支持的语言列表
 *
 * @returns 返回语言列表的二维数组
 */
  private getLanguages(): Array<Array<string>> {
    const n = navigator;
    const result = [];

    const language = n.language;
    if (language !== undefined) {
      result.push([language]);
    }

    if (Array.isArray(n.languages)) {
      // 如果不是 Chromium 86 或更高版本的浏览器，并且不是无痕模式，则添加 n.languages 到结果数组中
      // 从 Chromium 86 开始，无痕模式下 `navigator.language` 只有一个值：`navigator.language` 的值。因此，在这个浏览器中忽略该值。
      if (!(isChromium() && isChromium86OrNewer())) {
        result.push(n.languages);
      }
    } else if (typeof n.languages === "string") {
      const languages: string = n.languages;
      if (languages) {
        // 将 n.languages 字符串按逗号分割成数组，并添加到结果数组中
        result.push(languages.split(","));
      }
    }

    return result;
  }

  /**
 * 获取操作系统 CPU 信息
 *
 * @returns 返回操作系统 CPU 信息，若无法获取则返回 undefined
 */
  private getOsCpu(): string | undefined {
    return (navigator as any).oscpu;
  }

  /**
 * 获取平台信息
 *
 * @returns 平台信息
 */
  private getPlatform(): string {
    // 当请求桌面模式时，Android Chrome 86 和 87 以及 Android Firefox 80 和 84 不模拟平台值
    // Android Chrome 86 and 87 and Android Firefox 80 and 84 don't mock the platform value when desktop mode is requested
    const { platform } = navigator;

    // 当请求桌面版本时，iOS 模拟平台值：https://github.com/fingerprintjs/fingerprintjs/issues/514
    // 从 iOS 13 开始，iPad 默认使用桌面模式
    // 在 M1 Macs 上，该值为 'MacIntel'
    // 在 iPod Touch 上，该值为 'iPhone'
    if (platform === "MacIntel") {
      if (isWebKit() && !isDesktopSafari()) {
        return isIPad() ? "iPad" : "iPhone";
      }
    }

    // 返回平台值
    return platform;
  }


  /**
   * 获取浏览器插件列表
   *
   * @returns 插件列表的 JSON 字符串，如果不支持插件列表，则返回 undefined
   */
  private getPlugins(): string | undefined {
    // 获取浏览器插件列表
    const rawPlugins = navigator.plugins;

    // 如果浏览器不支持插件列表，则返回 undefined
    if (!rawPlugins) {
      return undefined;
    }

    // 存储插件数据的数组
    const plugins: PluginData[] = [];

    // Safari 10 不支持使用 for...of 遍历 navigator.plugins
    for (let i = 0; i < rawPlugins.length; ++i) {
      // 获取当前插件对象
      const plugin = rawPlugins[i];
      if (!plugin) {
        continue;
      }

      // 存储当前插件支持的 MIME 类型数据的数组
      const mimeTypes: PluginMimeTypeData[] = [];
      for (let j = 0; j < plugin.length; ++j) {
        // 获取当前插件支持的 MIME 类型对象
        const mimeType = plugin[j];
        mimeTypes.push({
          // MIME 类型
          type: mimeType.type,
          // MIME 类型对应的后缀名
          suffixes: mimeType.suffixes,
        });
      }

      // 将插件数据添加到插件数组中
      plugins.push({
        // 插件名称
        name: plugin.name,
        // 插件描述
        description: plugin.description,
        // 插件支持的 MIME 类型数据
        mimeTypes,
      });
    }

    // 将插件数组转换为 JSON 字符串并返回
    return JSON.stringify(plugins);
  }


  private screenFrameBackup?: FrameSize;
  private screenFrameSizeTimeoutId?: any;
  private screenFrameCheckInterval = 2500;

  /**
 * 监听屏幕帧大小，返回当前屏幕帧大小或undefined
 *
 * @returns 当前屏幕帧大小或undefined
 */
  private async watchScreenFrame(): Promise<FrameSize | undefined> {
    // 如果存在 screenFrameSizeTimeoutId，则返回 undefined
    if (this.screenFrameSizeTimeoutId !== undefined) {
      return undefined;
    }

    // 定义一个异步函数 checkScreenFrame
    const checkScreenFrame = async (): Promise<FrameSize> => {
      return new Promise((resolve, reject) => {
        // 获取当前屏幕帧大小
        const frameSize: FrameSize = this.getCurrentScreenFrame();

        // 如果帧大小为空
        if (this.isFrameSizeNull(frameSize)) {
          // 设置一个定时器，在指定的时间间隔后重新调用 checkScreenFrame 函数
          this.screenFrameSizeTimeoutId = setTimeout(async () => {
            const result: FrameSize = await checkScreenFrame();
            resolve(result);
          }, this.screenFrameCheckInterval);
        } else {
          // 将帧大小备份到 screenFrameBackup 属性中
          this.screenFrameBackup = frameSize;
          // 清除定时器
          this.screenFrameSizeTimeoutId = undefined;
          // 返回帧大小
          resolve(frameSize);
        }
      });
    };

    // 调用 checkScreenFrame 函数并返回结果
    return checkScreenFrame();
  }


  /**
   * 获取屏幕帧大小
   *
   * @returns 屏幕帧大小
   */
  private async getScreenFrame(): Promise<FrameSize> {
    // 等待屏幕帧变化
    await this.watchScreenFrame();

    // 获取当前屏幕帧大小
    let frameSize = this.getCurrentScreenFrame();

    // 如果帧大小为空
    if (this.isFrameSizeNull(frameSize)) {
      // 如果存在备份帧大小
      if (this.screenFrameBackup) {
        // 返回备份帧大小
        return [...this.screenFrameBackup];
      }

      // 如果存在全屏元素
      if (getFullscreenElement()) {
        // 退出全屏模式
        await exitFullscreen();
        // 再次获取当前屏幕帧大小
        frameSize = this.getCurrentScreenFrame();
      }
    }

    // 如果帧大小不为空
    if (!this.isFrameSizeNull(frameSize)) {
      // 将当前帧大小备份
      this.screenFrameBackup = frameSize;
    }

    // 返回帧大小
    return frameSize;
  }




  /**
 * 获取经过四舍五入处理的屏幕框架尺寸
 *
 * @returns 经过四舍五入处理的屏幕尺寸数组
 */
  private async getRoundedScreenFrame(): Promise<FrameSize> {
    try {
      const frameSize = await this.getScreenFrame();
      const roundingPrecision = 25;
      // 定义一个处理尺寸的函数
      const processSize = (sideSize: FrameSize[number]) =>
        sideSize === null ? null : round(sideSize, roundingPrecision);

      // 使用数组映射的方式处理每个边的尺寸
      // 使用这种写法是为了避免 TypeScript 的类型推断问题，而不需要使用 `as` 关键字
      // It might look like I don't know about `for` and `map`.
      // In fact, such code is used to avoid TypeScript issues without using `as`.
      return [
        processSize(frameSize[0]),
        processSize(frameSize[1]),
        processSize(frameSize[2]),
        processSize(frameSize[3]),
      ];
    } catch (err) {
      // 发生错误时，返回一个包含四个null的数组
      return new Promise((resolve, reject) =>
        resolve([null, null, null, null])
      );
    }
  }

  /**
 * 获取当前屏幕的框架尺寸。
 *
 * @returns 返回一个表示屏幕尺寸的数组，包含四个元素：
 *         - 可用高度（可能不可用，用null表示）
 *         - 窗口左侧距离屏幕左侧的距离（可能不可用，用0表示）
 *         - 窗口底部距离屏幕底部的距离（可能不可用，用0表示）
 *         - 窗口顶部距离屏幕顶部的距离（可能不可用，用null表示）
 */
  private getCurrentScreenFrame(): FrameSize {
    const s = screen;

    // 一些浏览器将屏幕分辨率作为字符串返回，例如 "1200"，而不是数字，例如 1200。
    // 我怀疑这是由某些插件为了防止指纹追踪而随机化浏览器属性所导致的。
    // 一些浏览器（如 IE、Edge ≤18）不提供 `screen.availLeft` 和 `screen.availTop`。
    // 在这种情况下，将属性值替换为 0，以避免失去 `screen.availWidth` 和 `screen.availHeight` 的熵。
    return [
      // 替换为可用顶部的浮点数值，若无法转换则为 null
      replaceNaN(toFloat((s as any).availTop), null),
      // 替换为屏幕宽度减去可用宽度再减去可用左侧的浮点数值，若无法转换则为 null
      replaceNaN(
        toFloat(s.width) -
        toFloat(s.availWidth) -
        replaceNaN(toFloat((s as any).availLeft), 0),
        null
      ),
      // 替换为屏幕高度减去可用高度再减去可用顶部的浮点数值，若无法转换则为 null
      replaceNaN(
        toFloat(s.height) -
        toFloat(s.availHeight) -
        replaceNaN(toFloat((s as any).availTop), 0),
        null
      ),
      // 替换为可用左侧的浮点数值，若无法转换则为 null
      replaceNaN(toFloat((s as any).availLeft), null),
    ];
  }



  /**
   * 判断帧大小数组是否为空
   *
   * @param frameSize 帧大小数组
   * @returns 如果帧大小数组全为null，则返回true，否则返回false
   */
  private isFrameSizeNull(frameSize: any[]): boolean {
    // 遍历数组中的每个元素
    for (let i = 0; i < 4; ++i) {
      // 如果当前元素是数字类型
      if (typeof frameSize[i] === "number") {
        // 则返回false，表示帧大小不为空
        return false;
      }
    }
    // 如果所有元素都不是数字类型，则返回true，表示帧大小为空
    return true;
  }


  /**
   * 获取屏幕分辨率
   *
   * @returns 返回一个包含两个数字的数组，分别代表屏幕的宽度和高度
   */
  private getScreenResolution(): Array<number> {
    const s = screen;

    // 有些浏览器返回的屏幕分辨率是字符串，例如 "1200"，而不是数字，例如 1200。
    // 我怀疑这是由某些插件为了防止指纹追踪而随机化浏览器属性所造成的。
    // 有些浏览器甚至返回的屏幕分辨率不是数字。
    const parseDimension = (value: any) => replaceNaN(toInt(value), null);

    // 解析屏幕宽度和高度，确保返回的是数字
    const dimensions = [parseDimension(s.width), parseDimension(s.height)];

    // 对解析后的宽度和高度进行排序，然后反转数组，确保宽度在前，高度在后
    dimensions.sort().reverse();

    // 返回屏幕宽度和高度的数组
    return dimensions;
  }



  /**
 * 获取时区偏移量
 *
 * @returns 返回当前时区的偏移量（单位：分钟）
 */
  private getTimezoneOffset(): number {
    const currentYear = new Date().getFullYear();

    // 时区偏移量可能会因为夏令时（DST）的变化而变化。
    // 使用非夏令时的时区偏移量作为结果时区偏移量。
    // 由于北半球和南半球的夏令时季节不同，
    // 因此同时考虑了1月和7月的时区偏移量。
    return Math.max(
      // `getTimezoneOffset` 在某些未识别的情况下会返回一个作为字符串的数字
      toFloat(new Date(currentYear, 0, 1).getTimezoneOffset()),
      toFloat(new Date(currentYear, 6, 1).getTimezoneOffset())
    );
  }



  /**
 * 获取当前时区
 *
 * @returns 返回当前时区字符串
 */
  private getTimezone(): string {
    // 获取浏览器中的日期时间格式对象
    const DateTimeFormat = window.Intl?.DateTimeFormat;
    if (DateTimeFormat) {
      // 获取浏览器当前时区
      const timezone = new DateTimeFormat().resolvedOptions().timeZone;
      if (timezone) {
        // 如果时区存在，则直接返回
        return timezone;
      }
    }

    // 对于不支持时区名称的浏览器
    // 负号是特定的，因为JS中的偏移量与实际偏移量相反
    const offset = -this.getTimezoneOffset();
    // 返回UTC格式的偏移量字符串
    return `UTC${offset >= 0 ? "+" : ""}${Math.abs(offset)}`;
  }


  /**
 * 获取触摸支持信息
 *
 * @returns 返回一个包含触摸支持信息的对象
 */
  private getTouchSupport(): IGetTouchSupport {
    const n = navigator;

    // 最大触摸点数
    let maxTouchPoints = 0;
    // 触摸事件
    let touchEvent;

    // 判断是否存在 maxTouchPoints 属性
    if (n.maxTouchPoints !== undefined) {
      // 将 maxTouchPoints 转换为整数
      maxTouchPoints = toInt(n.maxTouchPoints);
      // 判断是否存在 msMaxTouchPoints 属性
    } else if ((n as any).msMaxTouchPoints !== undefined) {
      // 将 msMaxTouchPoints 赋值给 maxTouchPoints
      maxTouchPoints = (n as any).msMaxTouchPoints;
    }

    try {
      // 尝试创建 TouchEvent 事件
      document.createEvent("TouchEvent");
      // 如果创建成功，将 touchEvent 设置为 true
      touchEvent = true;
    } catch {
      // 如果创建失败，将 touchEvent 设置为 false
      touchEvent = false;
    }

    // 判断 window 对象是否存在 ontouchstart 属性
    const touchStart = "ontouchstart" in window;

    // 返回包含最大触摸点数、触摸事件和触摸开始属性的对象
    return {
      maxTouchPoints,
      touchEvent,
      touchStart,
    };
  }


  /**
 * 判断当前浏览器是否处于无痕模式
 *
 * @returns 返回一个Promise对象，包含浏览器名称和是否处于无痕模式的信息
 */
  private async isIncognitoMode(): Promise<{
    browserName?: string;
    isIncognito?: boolean;
  }> {
    try {
      // 判断是否为浏览器环境
      if (!isBrowser()) return { browserName: "nodejs", isIncognito: false };

      let browserName = "Unknown";
      let result: boolean = false;

      // 如果是Safari浏览器
      if (isSafari()) {
        browserName = "Safari";
        // 调用Safari的隐私模式检测函数
        result = await safariPrivateTest();
      }
      // 如果是Chrome浏览器
      else if (isChrome()) {
        browserName = identifyChromium();
        // 调用Chrome的隐私模式检测函数
        result = await chromePrivateTest();
      }
      // 如果是Firefox浏览器
      else if (isFirefox()) {
        browserName = "Firefox";
        // 调用Firefox的隐私模式检测函数
        result = firefoxPrivateTest();
      }
      // 如果是Internet Explorer浏览器
      else if (isMSIE()) {
        browserName = "Internet Explorer";
        // 调用Internet Explorer的隐私模式检测函数
        result = msiePrivateTest();
      }
      // 如果不是以上任何一种浏览器
      else {
        throw new Error("detectIncognito cannot determine the browser");
      }

      // 返回浏览器名称和隐私模式检测结果
      return { browserName, isIncognito: result };
    } catch (err: any) {
      // 捕获异常，并返回一个未定义的浏览器名称和隐私模式检测结果
      return new Promise((resolve, reject) =>
        resolve({ browserName: undefined, isIncognito: undefined })
      );
    }
  }


}
