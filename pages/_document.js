import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        <style>{`
          @keyframes gradientShift {
            0%, 100% {
              background: radial-gradient(ellipse at 20% 30%, rgba(40, 40, 50, 0.4) 0%, transparent 50%), 
                          radial-gradient(ellipse at 80% 70%, rgba(30, 30, 40, 0.3) 0%, transparent 50%), 
                          linear-gradient(180deg, #000 0%, #0a0a0a 100%);
            }
            33% {
              background: radial-gradient(ellipse at 60% 40%, rgba(35, 35, 45, 0.4) 0%, transparent 50%), 
                          radial-gradient(ellipse at 30% 80%, rgba(25, 25, 35, 0.3) 0%, transparent 50%), 
                          linear-gradient(180deg, #000 0%, #0a0a0a 100%);
            }
            66% {
              background: radial-gradient(ellipse at 40% 70%, rgba(30, 30, 40, 0.4) 0%, transparent 50%), 
                          radial-gradient(ellipse at 70% 30%, rgba(35, 35, 45, 0.3) 0%, transparent 50%), 
                          linear-gradient(180deg, #000 0%, #0a0a0a 100%);
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
