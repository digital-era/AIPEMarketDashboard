// referrorigin.js

/**
 * 全局变量，用于存储从 URL 查询参数中获取的来源页面的 origin。
 * 如果没有找到该参数，则为 null。
 */
window.referrerOrigin = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. 获取当前页面的 URL 查询参数
    const urlParams = new URLSearchParams(window.location.search);

    // 2. 尝试获取名为 'referrer_origin' 的参数值
    const referrerOriginParam = urlParams.get('referrer_origin');

    if (referrerOriginParam) {
        // 3. 如果参数存在，解码其值（因为发送时进行了编码）
        try {
            const decodedOrigin = decodeURIComponent(referrerOriginParam);
            // 4. 将解码后的值保存到全局变量
            window.referrerOrigin = decodedOrigin;
            console.log("成功获取并保存 referrerOrigin:", window.referrerOrigin);
        } catch (error) {
            console.error("解码 referrer_origin 参数时发生错误:", error);
            // 可以在错误时设置为null或默认值
            window.referrerOrigin = null;
        }
    } else {
        console.log("URL 中未找到 'referrer_origin' 参数。");
    }
});
