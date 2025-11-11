

import React from 'react';
import { ArrowLeftIcon, BotMessageSquareIcon } from '../components/Icons';

interface PrivacyPolicyPageProps {
  onBack?: () => void;
  isEmbedded?: boolean;
}

const PrivacyPolicyContent: React.FC = () => (
    <>
        <div className="flex items-center gap-3 mb-6">
            <BotMessageSquareIcon className="w-8 h-8 text-gray-400" />
            <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
        </div>
        <div className="bg-[#131C1B] rounded-xl shadow-lg p-6 sm:p-8 space-y-6 text-gray-400 text-xs leading-relaxed">
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>

            <section>
                <h2 className="text-lg font-semibold text-white mb-2">1. Introduction</h2>
                <p>Welcome to Gemini Project Board. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us.</p>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-white mb-2">2. Information We Collect</h2>
                <p>We collect personal information that you voluntarily provide to us when you register on the application, express an interest in obtaining information about us or our products and Services, when you participate in activities on the application or otherwise when you contact us.</p>
                <p className="mt-2">The personal information that we collect depends on the context of your interactions with us and the application, the choices you make and the products and features you use. The personal information we collect may include the following: name, email address, password, and user-generated content (tasks, comments, etc.).</p>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-white mb-2">3. How We Use Your Information</h2>
                <p>We use personal information collected via our application for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations. We use the information we collect or receive:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>To facilitate account creation and logon process.</li>
                    <li>To post testimonials.</li>
                    <li>To manage user accounts.</li>
                    <li>To send administrative information to you.</li>
                    <li>To protect our Services.</li>
                    <li>To enforce our terms, conditions and policies for business purposes, to comply with legal and regulatory requirements or in connection with our contract.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-white mb-2">4. Will Your Information Be Shared With Anyone?</h2>
                <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. We do not share your data with third-party advertisers.</p>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-white mb-2">5. How We Keep Your Information Safe</h2>
                <p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security, and improperly collect, access, steal, or modify your information.</p>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-white mb-2">6. Your Privacy Rights</h2>
                <p>In some regions, you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability. In certain circumstances, you may also have the right to object to the processing of your personal information.</p>
            </section>
            
            <section>
                <h2 className="text-lg font-semibold text-white mb-2">7. Changes to This Policy</h2>
                <p>We may update this privacy notice from time to time. The updated version will be indicated by an updated "Last Updated" date and the updated version will be effective as soon as it is accessible. We encourage you to review this privacy policy frequently to be informed of how we are protecting your information.</p>
            </section>
        </div>
    </>
);


export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack, isEmbedded = false }) => {
  if (isEmbedded) {
    return (
        <div className="max-w-4xl mx-auto">
            <PrivacyPolicyContent />
        </div>
    );
  }

  return (
    <div className="min-h-screen font-sans bg-[#1C2326] text-gray-300 p-4 sm:p-8 custom-scrollbar">
      <div className="max-w-4xl mx-auto">
        <header className="sticky top-0 bg-[#1C2326]/80 backdrop-blur-sm -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mb-4 z-10">
            {onBack && (
                <button onClick={onBack} className="flex items-center gap-2 text-xs font-semibold text-white hover:text-gray-300">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back
                </button>
            )}
        </header>
        <PrivacyPolicyContent />
      </div>
    </div>
  );
};
