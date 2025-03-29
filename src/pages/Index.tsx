
import { Helmet } from "react-helmet";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>nayel rehman</title>
        <meta name="description" content="i'm nayel" />
      </Helmet>
      <main className="min-h-screen bg-[#2a2a2a] text-white font-crimson flex items-center justify-center p-6">
        <section className="w-full max-w-2xl">
          <div className="text-left">
            <h1 className="text-5xl font-bold mb-10">nayel rehman</h1>
            <div className="space-y-8 text-xl">
              <p>I'm a 17-year-old based in northern va</p>
              
              <p>
                I run{" "}
                <a
                  href="https://cactuscapital.org/"
                  target="_blank"
                  rel="noopener"
                  className="text-[#5b89c9] hover:underline"
                >
                  cactus capital
                </a>
                , a microgrant fund for student builders
              </p>
              
              <p>
                currently, I'm building on a search & rescue startup,{" "}
                <a
                  href="https://wifind.tech"
                  target="_blank"
                  rel="noopener"
                  className="text-[#5b89c9] hover:underline"
                >
                  wifind
                </a>
              </p>
              
              <p>
                previously, I created{" "}
                <a
                  href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4681098"
                  target="_blank"
                  rel="noopener"
                  className="text-[#5b89c9] hover:underline"
                >
                  namesense
                </a>
                , an ai powered assistive device
              </p>
            </div>
            
            <div className="flex gap-6 mt-12">
              <a 
                href="https://www.instagram.com/_nayelr/" 
                target="_blank" 
                rel="noopener"
                className="text-white hover:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                </svg>
              </a>
              <a 
                href="https://x.com/nayelr_/" 
                target="_blank" 
                rel="noopener"
                className="text-white hover:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
              <a 
                href="https://linkedin.com/in/nayelrehman/" 
                target="_blank" 
                rel="noopener"
                className="text-white hover:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-linkedin">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect width="4" height="12" x="2" y="9"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </a>
              <a 
                href="mailto:nayel@cactuscapital.org" 
                target="_blank" 
                rel="noopener"
                className="text-white hover:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail">
                  <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default Index;
