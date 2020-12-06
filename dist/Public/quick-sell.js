var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// ==UserScript==
// @name        Steam Quick sell
// @icon        https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg
// @namespace   https://github.com/Nuklon
// @author      Nuklon
// @license     MIT
// @version     6.8.2
// @description Enhances the Steam Inventory and Steam Market.
// @include     *://steamcommunity.com/id/*/inventory*
// @include     *://steamcommunity.com/profiles/*/inventory*
// @include     *://steamcommunity.com/market*
// @include     *://steamcommunity.com/tradeoffer*
// @require     https://code.jquery.com/jquery-3.5.1.min.js
// @require     https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/async/2.6.0/async.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/localforage/1.7.1/localforage.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/list.js/1.5.0/list.js
// @grant       unsafeWindow
// ==/UserScript==
// jQuery is already added by Steam, force no conflict mode.
const country = "BR";
const language = "brazilian";
const currencyId = 7;
const getCurrentItemOrdersHistogram = (itemId) => {
    return new Promise((resolve, reject) => {
        var url = window.location.protocol +
            "//steamcommunity.com/market/itemordershistogram?language=english&currency=" +
            currencyId +
            "&item_nameid=" +
            itemId +
            "&two_factor=0";
        $.get(url, function (histogram) {
            resolve(histogram);
        }).fail(function () {
            reject({});
        });
    });
};
const getCurrentMarketItemNameId = (appid, market_name) => __awaiter(this, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        var url = window.location.protocol +
            "//steamcommunity.com/market/listings/" +
            appid +
            "/" +
            market_name;
        $.get(url, function (page) {
            var matches = /Market_LoadOrderSpread\( (.+) \);/.exec(page);
            var item_nameid = matches[1];
            resolve(item_nameid);
        }).fail(function (error) {
            alert(error);
        });
    });
});
const isUserLogged = () => (typeof unsafeWindow.g_rgWalletInfo !== "undefined" &&
    unsafeWindow.g_rgWalletInfo != null) ||
    (typeof unsafeWindow.g_bLoggedIn !== "undefined" && unsafeWindow.g_bLoggedIn);
const updateas = () => __awaiter(this, void 0, void 0, function* () {
    const href = document
        .getElementsByClassName("item_market_actions")[0]
        //@ts-ignore
        .getElementsBySelector("a")[0].href;
    const splitedUrl = href.split("/");
    const productName = splitedUrl[splitedUrl.length - 1];
    const appId = splitedUrl[splitedUrl.length - 2];
    const productId = yield getCurrentMarketItemNameId(appId, productName);
    const histogram = yield getCurrentItemOrdersHistogram(productId);
    const lowest_sell_order = histogram.lowest_sell_order;
    alert(lowest_sell_order);
});
const initializeControl = () => {
    const selector = "#global_header";
    $(selector).append(`<div class="absolute h3 w3 z-999">tooop</div>`);
    const b = $(document.getElementById("inventories"));
    $(b).on("click", () => {
        updateas();
    });
};
const initializeScript = () => {
    setTimeout(() => {
        initializeControl();
    }, 2000);
};
(function ($, async) {
    $(document).ready(function () {
        if (!isUserLogged()) {
            return;
        }
        //
        if (window.location.host === "steamcommunity.com") {
            initializeScript();
        }
    });
    //@ts-ignore
})(jQuery, async);
//# sourceMappingURL=quick-sell.js.map