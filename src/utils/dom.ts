import { MaybePromise, wait } from './async';
/**
 * Creates and keeps an invisible iframe while the given function runs.
 * The given function is called when the iframe is loaded and has a body.
 * The iframe allows to measure DOM sizes inside itself.
 *
 * Notice: passing an initial HTML code doesn't work in IE.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */

export function parseSimpleCssSelector(selector: string): [tag: string | undefined, attributes: Record<string, string[]>] {
    const errorMessage = `Unexpected syntax '${selector}'`;
    const tagMatch = /^\s*([a-z-]*)(.*)$/i.exec(selector) as RegExpExecArray;
    const tag = tagMatch[1] || undefined;
    const attributes: Record<string, string[]> = {};
    const partsRegex = /([.:#][\w-]+|\[.+?\])/gi;
  
    const addAttribute = (name: string, value: string) => {
      attributes[name] = attributes[name] || [];
      attributes[name].push(value);
    };
  
    for (;;) {
      const match = partsRegex.exec(tagMatch[2]);
      if (!match) {
        break;
      }
      const part = match[0];
      switch (part[0]) {
        case '.':
          addAttribute('class', part.slice(1));
          break;
        case '#':
          addAttribute('id', part.slice(1));
          break;
        case '[': {
          const attributeMatch = /^\[([\w-]+)([~|^$*]?=("(.*?)"|([\w-]+)))?(\s+[is])?\]$/.exec(part);
          if (attributeMatch) {
            addAttribute(attributeMatch[1], attributeMatch[4] ?? attributeMatch[5] ?? '');
          } else {
            throw new Error(errorMessage);
          }
          break;
        }
        default:
          throw new Error(errorMessage);
      }
    }
  
    return [tag, attributes];
  }

  
export async function withIframe<T>(
  action: (iframe: HTMLIFrameElement, iWindow: Window) => MaybePromise<T>,
  initialHtml?: string,
  domPollInterval = 50,
): Promise<T> {
  const d = document;

  // document.body can be null while the page is loading
  while (!d.body) {
    await wait(domPollInterval);
  }

  const iframe = d.createElement('iframe');

  try {
    await new Promise<void>((_resolve, _reject) => {
      let isComplete = false;
      const resolve = () => {
        isComplete = true;
        _resolve();
      };
      const reject = (error: unknown) => {
        isComplete = true;
        _reject(error);
      };

      iframe.onload = resolve;
      iframe.onerror = reject;
      const { style } = iframe;
      style.setProperty('display', 'block', 'important'); // Required for browsers to calculate the layout
      style.position = 'absolute';
      style.top = '0';
      style.left = '0';
      style.visibility = 'hidden';
      if (initialHtml && 'srcdoc' in iframe) {
        iframe.srcdoc = initialHtml;
      } else {
        iframe.src = 'about:blank';
      }
      d.body.appendChild(iframe);

      // WebKit in WeChat doesn't fire the iframe's `onload` for some reason.
      // This code checks for the loading state manually.
      // See https://github.com/fingerprintjs/fingerprintjs/issues/645
      const checkReadyState = () => {
        // The ready state may never become 'complete' in Firefox despite the 'load' event being fired.
        // So an infinite setTimeout loop can happen without this check.
        // See https://github.com/fingerprintjs/fingerprintjs/pull/716#issuecomment-986898796
        if (isComplete) {
          return;
        }

        // Make sure iframe.contentWindow and iframe.contentWindow.document are both loaded
        // The contentWindow.document can miss in JSDOM (https://github.com/jsdom/jsdom).
        if (iframe.contentWindow?.document?.readyState === 'complete') {
          resolve();
        } else {
          setTimeout(checkReadyState, 10);
        }
      };
      checkReadyState();
    });

    while (!iframe.contentWindow?.document?.body) {
      await wait(domPollInterval);
    }

    return await action(iframe, iframe.contentWindow);
  } finally {
    iframe.parentNode?.removeChild(iframe);
  }
}

export function selectorToElement(selector: string): HTMLElement {
  const [tag, attributes] = parseSimpleCssSelector(selector);
  const element = document.createElement(tag ?? 'div');
  for (const name of Object.keys(attributes)) {
    const value = attributes[name].join(' ');
    // Changing the `style` attribute can cause a CSP error, therefore we change the `style.cssText` property.
    // https://github.com/fingerprintjs/fingerprintjs/issues/733
    if (name === 'style') {
      addStyleString(element.style, value);
    } else {
      element.setAttribute(name, value);
    }
  }
  return element;
}

/**
 * Adds CSS styles from a string in such a way that doesn't trigger a CSP warning (unsafe-inline or unsafe-eval)
 */
export function addStyleString(style: CSSStyleDeclaration, source: string): void {
  // We don't use `style.cssText` because browsers must block it when no `unsafe-eval` CSP is presented: https://csplite.com/csp145/#w3c_note
  // Even though the browsers ignore this standard, we don't use `cssText` just in case.
  for (const property of source.split(';')) {
    const match = /^\s*([\w-]+)\s*:\s*(.+?)(\s*!([\w-]+))?\s*$/.exec(property);
    if (match) {
      const [, name, value, , priority] = match;
      style.setProperty(name, value, priority || ''); // The last argument can't be undefined in IE11
    }
  }
}

export function getFullscreenElement(): Element | null {
  const d = document
  return d.fullscreenElement || (d as any).msFullscreenElement || (d as any).mozFullScreenElement || (d as any).webkitFullscreenElement || null
}

export function exitFullscreen(): Promise<void> {
  const d = document
  // `call` is required because the function throws an error without a proper "this" context
  return (d.exitFullscreen || (d as any).msExitFullscreen || (d as any).mozCancelFullScreen || (d as any).webkitExitFullscreen).call(d)
}


type Filters = Record<string, string[]>;
export function getFilters(): Filters {
  const fromB64 = atob; // Just for better minification

  return {
    abpIndo: ['#Iklan-Melayang', '#Kolom-Iklan-728', '#SidebarIklan-wrapper', fromB64('YVt0aXRsZT0iN25hZ2EgcG9rZXIiIGld'), '[title="ALIENBOLA" i]'],
    abpvn: [
      '#quangcaomb',
      fromB64('Lmlvc0Fkc2lvc0Fkcy1sYXlvdXQ='),
      '.quangcao',
      fromB64('W2hyZWZePSJodHRwczovL3I4OC52bi8iXQ=='),
      fromB64('W2hyZWZePSJodHRwczovL3piZXQudm4vIl0='),
    ],
    adBlockFinland: [
      '.mainostila',
      fromB64('LnNwb25zb3JpdA=='),
      '.ylamainos',
      fromB64('YVtocmVmKj0iL2NsaWNrdGhyZ2guYXNwPyJd'),
      fromB64('YVtocmVmXj0iaHR0cHM6Ly9hcHAucmVhZHBlYWsuY29tL2FkcyJd'),
    ],
    adBlockPersian: ['#navbar_notice_50', '.kadr', 'TABLE[width="140px"]', '#divAgahi', fromB64('I2FkMl9pbmxpbmU=')],
    adBlockWarningRemoval: ['#adblock-honeypot', '.adblocker-root', '.wp_adblock_detect', fromB64('LmhlYWRlci1ibG9ja2VkLWFk'), fromB64('I2FkX2Jsb2NrZXI=')],
    adGuardAnnoyances: ['amp-embed[type="zen"]', '.hs-sosyal', '#cookieconsentdiv', 'div[class^="app_gdpr"]', '.as-oil'],
    adGuardBase: [
      '.BetterJsPopOverlay',
      fromB64('I2FkXzMwMFgyNTA='),
      fromB64('I2Jhbm5lcmZsb2F0MjI='),
      fromB64('I2FkLWJhbm5lcg=='),
      fromB64('I2NhbXBhaWduLWJhbm5lcg=='),
    ],
    adGuardChinese: [
      fromB64('LlppX2FkX2FfSA=='),
      fromB64('YVtocmVmKj0iL29kMDA1LmNvbSJd'),
      fromB64('YVtocmVmKj0iLmh0aGJldDM0LmNvbSJd'),
      '.qq_nr_lad',
      '#widget-quan',
    ],
    adGuardFrench: [
      fromB64('I2Jsb2NrLXZpZXdzLWFkcy1zaWRlYmFyLWJsb2NrLWJsb2Nr'),
      '#pavePub',
      fromB64('LmFkLWRlc2t0b3AtcmVjdGFuZ2xl'),
      '.mobile_adhesion',
      '.widgetadv',
    ],
    adGuardGerman: [
      fromB64('LmJhbm5lcml0ZW13ZXJidW5nX2hlYWRfMQ=='),
      fromB64('LmJveHN0YXJ0d2VyYnVuZw=='),
      fromB64('LndlcmJ1bmcz'),
      fromB64('YVtocmVmXj0iaHR0cDovL3d3dy5laXMuZGUvaW5kZXgucGh0bWw/cmVmaWQ9Il0='),
      fromB64('YVtocmVmXj0iaHR0cHM6Ly93d3cudGlwaWNvLmNvbS8/YWZmaWxpYXRlSWQ9Il0='),
    ],
    adGuardJapanese: [
      '#kauli_yad_1',
      fromB64('YVtocmVmXj0iaHR0cDovL2FkMi50cmFmZmljZ2F0ZS5uZXQvIl0='),
      fromB64('Ll9wb3BJbl9pbmZpbml0ZV9hZA=='),
      fromB64('LmFkZ29vZ2xl'),
      fromB64('LmFkX3JlZ3VsYXIz'),
    ],
    adGuardMobile: [fromB64('YW1wLWF1dG8tYWRz'), fromB64('LmFtcF9hZA=='), 'amp-embed[type="24smi"]', '#mgid_iframe1', fromB64('I2FkX2ludmlld19hcmVh')],
    adGuardRussian: [
      fromB64('YVtocmVmXj0iaHR0cHM6Ly9hZC5sZXRtZWFkcy5jb20vIl0='),
      fromB64('LnJlY2xhbWE='),
      'div[id^="smi2adblock"]',
      fromB64('ZGl2W2lkXj0iQWRGb3hfYmFubmVyXyJd'),
      fromB64('I2FkX3NxdWFyZQ=='),
    ],
    adGuardSocial: [
      fromB64('YVtocmVmXj0iLy93d3cuc3R1bWJsZXVwb24uY29tL3N1Ym1pdD91cmw9Il0='),
      fromB64('YVtocmVmXj0iLy90ZWxlZ3JhbS5tZS9zaGFyZS91cmw/Il0='),
      '.etsy-tweet',
      '#inlineShare',
      '.popup-social',
    ],
    adGuardSpanishPortuguese: ['#barraPublicidade', '#Publicidade', '#publiEspecial', '#queTooltip', fromB64('W2hyZWZePSJodHRwOi8vYWRzLmdsaXNwYS5jb20vIl0=')],
    adGuardTrackingProtection: [
      '#qoo-counter',
      fromB64('YVtocmVmXj0iaHR0cDovL2NsaWNrLmhvdGxvZy5ydS8iXQ=='),
      fromB64('YVtocmVmXj0iaHR0cDovL2hpdGNvdW50ZXIucnUvdG9wL3N0YXQucGhwIl0='),
      fromB64('YVtocmVmXj0iaHR0cDovL3RvcC5tYWlsLnJ1L2p1bXAiXQ=='),
      '#top100counter',
    ],
    adGuardTurkish: [
      '#backkapat',
      fromB64('I3Jla2xhbWk='),
      fromB64('YVtocmVmXj0iaHR0cDovL2Fkc2Vydi5vbnRlay5jb20udHIvIl0='),
      fromB64('YVtocmVmXj0iaHR0cDovL2l6bGVuemkuY29tL2NhbXBhaWduLyJd'),
      fromB64('YVtocmVmXj0iaHR0cDovL3d3dy5pbnN0YWxsYWRzLm5ldC8iXQ=='),
    ],
    bulgarian: [fromB64('dGQjZnJlZW5ldF90YWJsZV9hZHM='), '#ea_intext_div', '.lapni-pop-over', '#xenium_hot_offers', fromB64('I25ld0Fk')],
    easyList: [
      fromB64('I0FEX0NPTlRST0xfMjg='),
      fromB64('LnNlY29uZC1wb3N0LWFkcy13cmFwcGVy'),
      '.universalboxADVBOX03',
      fromB64('LmFkdmVydGlzZW1lbnQtNzI4eDkw'),
      fromB64('LnNxdWFyZV9hZHM='),
    ],
    easyListChina: [
      fromB64('YVtocmVmKj0iLndlbnNpeHVldGFuZy5jb20vIl0='),
      fromB64('LmFwcGd1aWRlLXdyYXBbb25jbGljayo9ImJjZWJvcy5jb20iXQ=='),
      fromB64('LmZyb250cGFnZUFkdk0='),
      '#taotaole',
      '#aafoot.top_box',
    ],
    easyListCookie: ['#AdaCompliance.app-notice', '.text-center.rgpd', '.panel--cookie', '.js-cookies-andromeda', '.elxtr-consent'],
    easyListCzechSlovak: [
      '#onlajny-stickers',
      fromB64('I3Jla2xhbW5pLWJveA=='),
      fromB64('LnJla2xhbWEtbWVnYWJvYXJk'),
      '.sklik',
      fromB64('W2lkXj0ic2tsaWtSZWtsYW1hIl0='),
    ],
    easyListDutch: [
      fromB64('I2FkdmVydGVudGll'),
      fromB64('I3ZpcEFkbWFya3RCYW5uZXJCbG9jaw=='),
      '.adstekst',
      fromB64('YVtocmVmXj0iaHR0cHM6Ly94bHR1YmUubmwvY2xpY2svIl0='),
      '#semilo-lrectangle',
    ],
    easyListGermany: [
      fromB64('I0FkX1dpbjJkYXk='),
      fromB64('I3dlcmJ1bmdzYm94MzAw'),
      fromB64('YVtocmVmXj0iaHR0cDovL3d3dy5yb3RsaWNodGthcnRlaS5jb20vP3NjPSJd'),
      fromB64('I3dlcmJ1bmdfd2lkZXNreXNjcmFwZXJfc2NyZWVu'),
      fromB64('YVtocmVmXj0iaHR0cDovL2xhbmRpbmcucGFya3BsYXR6a2FydGVpLmNvbS8/YWc9Il0='),
    ],
    easyListItaly: [
      fromB64('LmJveF9hZHZfYW5udW5jaQ=='),
      '.sb-box-pubbliredazionale',
      fromB64('YVtocmVmXj0iaHR0cDovL2FmZmlsaWF6aW9uaWFkcy5zbmFpLml0LyJd'),
      fromB64('YVtocmVmXj0iaHR0cHM6Ly9hZHNlcnZlci5odG1sLml0LyJd'),
      fromB64('YVtocmVmXj0iaHR0cHM6Ly9hZmZpbGlhemlvbmlhZHMuc25haS5pdC8iXQ=='),
    ],
    easyListLithuania: [
      fromB64('LnJla2xhbW9zX3RhcnBhcw=='),
      fromB64('LnJla2xhbW9zX251b3JvZG9z'),
      fromB64('aW1nW2FsdD0iUmVrbGFtaW5pcyBza3lkZWxpcyJd'),
      fromB64('aW1nW2FsdD0iRGVkaWt1b3RpLmx0IHNlcnZlcmlhaSJd'),
      fromB64('aW1nW2FsdD0iSG9zdGluZ2FzIFNlcnZlcmlhaS5sdCJd'),
    ],
    estonian: [fromB64('QVtocmVmKj0iaHR0cDovL3BheTRyZXN1bHRzMjQuZXUiXQ==')],
    fanboyAnnoyances: ['#feedback-tab', '#taboola-below-article', '.feedburnerFeedBlock', '.widget-feedburner-counter', '[title="Subscribe to our blog"]'],
    fanboyAntiFacebook: ['.util-bar-module-firefly-visible'],
    fanboyEnhancedTrackers: [
      '.open.pushModal',
      '#issuem-leaky-paywall-articles-zero-remaining-nag',
      '#sovrn_container',
      'div[class$="-hide"][zoompage-fontsize][style="display: block;"]',
      '.BlockNag__Card',
    ],
    fanboySocial: ['.td-tags-and-social-wrapper-box', '.twitterContainer', '.youtube-social', 'a[title^="Like us on Facebook"]', 'img[alt^="Share on Digg"]'],
    frellwitSwedish: [
      fromB64('YVtocmVmKj0iY2FzaW5vcHJvLnNlIl1bdGFyZ2V0PSJfYmxhbmsiXQ=='),
      fromB64('YVtocmVmKj0iZG9rdG9yLXNlLm9uZWxpbmsubWUiXQ=='),
      'article.category-samarbete',
      fromB64('ZGl2LmhvbGlkQWRz'),
      'ul.adsmodern',
    ],
    greekAdBlock: [
      fromB64('QVtocmVmKj0iYWRtYW4ub3RlbmV0LmdyL2NsaWNrPyJd'),
      fromB64('QVtocmVmKj0iaHR0cDovL2F4aWFiYW5uZXJzLmV4b2R1cy5nci8iXQ=='),
      fromB64('QVtocmVmKj0iaHR0cDovL2ludGVyYWN0aXZlLmZvcnRobmV0LmdyL2NsaWNrPyJd'),
      'DIV.agores300',
      'TABLE.advright',
    ],
    hungarian: ['#cemp_doboz', '.optimonk-iframe-container', fromB64('LmFkX19tYWlu'), fromB64('W2NsYXNzKj0iR29vZ2xlQWRzIl0='), '#hirdetesek_box'],
    iDontCareAboutCookies: [
      '.alert-info[data-block-track*="CookieNotice"]',
      '.ModuleTemplateCookieIndicator',
      '.o--cookies--container',
      '.cookie-msg-info-container',
      '#cookies-policy-sticky',
    ],
    icelandicAbp: [fromB64('QVtocmVmXj0iL2ZyYW1ld29yay9yZXNvdXJjZXMvZm9ybXMvYWRzLmFzcHgiXQ==')],
    latvian: [
      fromB64(
        'YVtocmVmPSJodHRwOi8vd3d3LnNhbGlkemluaS5sdi8iXVtzdHlsZT0iZGlzcGxheTogYmxvY2s7IHdpZHRoOiAxMjBweDsgaGVpZ2h0O' +
          'iA0MHB4OyBvdmVyZmxvdzogaGlkZGVuOyBwb3NpdGlvbjogcmVsYXRpdmU7Il0=',
      ),
      fromB64(
        'YVtocmVmPSJodHRwOi8vd3d3LnNhbGlkemluaS5sdi8iXVtzdHlsZT0iZGlzcGxheTogYmxvY2s7IHdpZHRoOiA4OHB4OyBoZWlnaHQ6I' +
          'DMxcHg7IG92ZXJmbG93OiBoaWRkZW47IHBvc2l0aW9uOiByZWxhdGl2ZTsiXQ==',
      ),
    ],
    listKr: [
      fromB64('YVtocmVmKj0iLy9hZC5wbGFuYnBsdXMuY28ua3IvIl0='),
      fromB64('I2xpdmVyZUFkV3JhcHBlcg=='),
      fromB64('YVtocmVmKj0iLy9hZHYuaW1hZHJlcC5jby5rci8iXQ=='),
      fromB64('aW5zLmZhc3R2aWV3LWFk'),
      '.revenue_unit_item.dable',
    ],
    listeAr: [
      fromB64('LmdlbWluaUxCMUFk'),
      '.right-and-left-sponsers',
      fromB64('YVtocmVmKj0iLmFmbGFtLmluZm8iXQ=='),
      fromB64('YVtocmVmKj0iYm9vcmFxLm9yZyJd'),
      fromB64('YVtocmVmKj0iZHViaXp6bGUuY29tL2FyLz91dG1fc291cmNlPSJd'),
    ],
    listeFr: [
      fromB64('YVtocmVmXj0iaHR0cDovL3Byb21vLnZhZG9yLmNvbS8iXQ=='),
      fromB64('I2FkY29udGFpbmVyX3JlY2hlcmNoZQ=='),
      fromB64('YVtocmVmKj0id2Vib3JhbWEuZnIvZmNnaS1iaW4vIl0='),
      '.site-pub-interstitiel',
      'div[id^="crt-"][data-criteo-id]',
    ],
    officialPolish: [
      '#ceneo-placeholder-ceneo-12',
      fromB64('W2hyZWZePSJodHRwczovL2FmZi5zZW5kaHViLnBsLyJd'),
      fromB64('YVtocmVmXj0iaHR0cDovL2Fkdm1hbmFnZXIudGVjaGZ1bi5wbC9yZWRpcmVjdC8iXQ=='),
      fromB64('YVtocmVmXj0iaHR0cDovL3d3dy50cml6ZXIucGwvP3V0bV9zb3VyY2UiXQ=='),
      fromB64('ZGl2I3NrYXBpZWNfYWQ='),
    ],
    ro: [
      fromB64('YVtocmVmXj0iLy9hZmZ0cmsuYWx0ZXgucm8vQ291bnRlci9DbGljayJd'),
      'a[href^="/magazin/"]',
      fromB64('YVtocmVmXj0iaHR0cHM6Ly9ibGFja2ZyaWRheXNhbGVzLnJvL3Ryay9zaG9wLyJd'),
      fromB64('YVtocmVmXj0iaHR0cHM6Ly9ldmVudC4ycGVyZm9ybWFudC5jb20vZXZlbnRzL2NsaWNrIl0='),
      fromB64('YVtocmVmXj0iaHR0cHM6Ly9sLnByb2ZpdHNoYXJlLnJvLyJd'),
    ],
    ruAd: [
      fromB64('YVtocmVmKj0iLy9mZWJyYXJlLnJ1LyJd'),
      fromB64('YVtocmVmKj0iLy91dGltZy5ydS8iXQ=='),
      fromB64('YVtocmVmKj0iOi8vY2hpa2lkaWtpLnJ1Il0='),
      '#pgeldiz',
      '.yandex-rtb-block',
    ],
    thaiAds: ['a[href*=macau-uta-popup]', fromB64('I2Fkcy1nb29nbGUtbWlkZGxlX3JlY3RhbmdsZS1ncm91cA=='), fromB64('LmFkczMwMHM='), '.bumq', '.img-kosana'],
    webAnnoyancesUltralist: ['#mod-social-share-2', '#social-tools', fromB64('LmN0cGwtZnVsbGJhbm5lcg=='), '.zergnet-recommend', '.yt.btn-link.btn-md.btn'],
  };
}
