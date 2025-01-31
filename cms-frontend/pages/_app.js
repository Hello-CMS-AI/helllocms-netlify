// pages/_app.js

import 'antd/dist/reset.css'; // Correct import for Ant Design global styles
import '../styles/globals.css'; // Your custom global styles

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;

