"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useLanguage } from "@/contexts/language-context"

interface TermsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  const { t } = useLanguage()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4 pb-6 border-b">
          <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {t("terms.title")}
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("terms.lastUpdated")} December 2024
          </p>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {/* Section 1: Acceptance of Terms */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              1. {t("terms.section1.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t("terms.section1.desc")}
            </p>
          </section>

          {/* Section 2: Description of Service */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              2. {t("terms.section2.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t("terms.section2.desc")}
            </p>
          </section>

          {/* Section 3: User Accounts and Registration */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              3. {t("terms.section3.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {t("terms.section3.desc")}
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section3.item1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section3.item2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section3.item3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section3.item4")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section3.item5")}</span>
              </li>
            </ul>
          </section>

          {/* Section 4: Acceptable Use Policy */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              4. {t("terms.section4.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {t("terms.section4.desc")}
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section4.item1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section4.item2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section4.item3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section4.item4")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section4.item5")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section4.item6")}</span>
              </li>
            </ul>
          </section>

          {/* Section 5: Resource Usage and Limits */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              5. {t("terms.section5.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {t("terms.section5.desc")}
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section5.item1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section5.item2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section5.item3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section5.item4")}</span>
              </li>
            </ul>
          </section>

          {/* Section 6: Payment and Billing */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              6. {t("terms.section6.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {t("terms.section6.desc")}
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section6.item1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section6.item2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section6.item3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section6.item4")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section6.item5")}</span>
              </li>
            </ul>
          </section>

          {/* Section 7: Intellectual Property */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              7. {t("terms.section7.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {t("terms.section7.desc")}
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section7.item1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section7.item2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section7.item3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section7.item4")}</span>
              </li>
            </ul>
          </section>

          {/* Section 8: Data and Privacy */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              8. {t("terms.section8.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {t("terms.section8.desc")}
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section8.item1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section8.item2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section8.item3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section8.item4")}</span>
              </li>
            </ul>
          </section>

          {/* Section 9: Service Availability */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              9. {t("terms.section9.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {t("terms.section9.desc")}
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section9.item1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section9.item2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section9.item3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section9.item4")}</span>
              </li>
            </ul>
          </section>

          {/* Section 10: Limitation of Liability */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              10. {t("terms.section10.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {t("terms.section10.desc")}
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section10.item1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section10.item2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section10.item3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section10.item4")}</span>
              </li>
            </ul>
          </section>

          {/* Section 11: Termination */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              11. {t("terms.section11.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {t("terms.section11.desc")}
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section11.item1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section11.item2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section11.item3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{t("terms.section11.item4")}</span>
              </li>
            </ul>
          </section>

          {/* Section 12: Changes to Terms */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              12. {t("terms.section12.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t("terms.section12.desc")}
            </p>
          </section>

          {/* Section 13: Contact Information */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              13. {t("terms.section13.title")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {t("terms.section13.desc")}
            </p>
            <div className="space-y-2 ml-6">
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                {t("terms.contact.title")}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                {t("terms.contact.email")}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                {t("terms.contact.address")}
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
} 