import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        <style>{`
          @keyframes gradientShift {
            0% {
              opacity: 1;
            }
            50% {
              opacity: 0.85;
            }
            100% {
              opacity: 1;
            }
          }

          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
          }

          button:active {
            transform: translateY(0);
          }

          textarea:focus {
            border-color: rgba(255, 255, 255, 0.3);
          }
        `}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
