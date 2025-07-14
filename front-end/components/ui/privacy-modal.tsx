"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

interface PrivacyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  const { t } = useLanguage()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col [&>button]:hidden overflow-hidden">
        {/* Sticky Header with Close Button */}
        <div className="flex-shrink-0 bg-background border-b px-6 py-4 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {t("privacy.title")}
          </DialogTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t("privacy.lastUpdated")} {new Date().toLocaleDateString()}
          </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 ml-4 flex-shrink-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 rounded-b-lg">
          <div className="space-y-8 text-sm leading-relaxed">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                {t("privacy.section1.title")}
            </h2>
              <p className="text-gray-700 dark:text-gray-300 pl-9">
                {t("privacy.section1.desc")}
            </p>
              <ul className="space-y-2 pl-9">
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section1.item1")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section1.item2")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section1.item3")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section1.item4")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section1.item5")}</span>
              </li>
            </ul>
          </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                {t("privacy.section2.title")}
            </h2>
              <p className="text-gray-700 dark:text-gray-300 pl-9">{t("privacy.section2.desc")}</p>
              <ul className="space-y-2 pl-9">
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section2.item1")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section2.item2")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section2.item3")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section2.item4")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section2.item5")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section2.item6")}</span>
              </li>
            </ul>
          </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                {t("privacy.section3.title")}
            </h2>
              <p className="text-gray-700 dark:text-gray-300 pl-9">
                {t("privacy.section3.desc")}
            </p>
              <ul className="space-y-2 pl-9">
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section3.item1")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section3.item2")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section3.item3")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section3.item4")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section3.item5")}</span>
              </li>
            </ul>
          </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">4</span>
                {t("privacy.section4.title")}
            </h2>
              <p className="text-gray-700 dark:text-gray-300 pl-9">
                {t("privacy.section4.desc")}
            </p>
          </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">5</span>
                {t("privacy.section5.title")}
            </h2>
              <p className="text-gray-700 dark:text-gray-300 pl-9">
                {t("privacy.section5.desc")}
            </p>
          </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">6</span>
                {t("privacy.section6.title")}
            </h2>
              <p className="text-gray-700 dark:text-gray-300 pl-9">{t("privacy.section6.desc")}</p>
              <ul className="space-y-2 pl-9">
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section6.item1")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section6.item2")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section6.item3")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section6.item4")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section6.item5")}</span>
              </li>
              <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">{t("privacy.section6.item6")}</span>
              </li>
            </ul>
          </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">7</span>
                {t("privacy.section7.title")}
            </h2>
              <p className="text-gray-700 dark:text-gray-300 pl-9">
                {t("privacy.section7.desc")}
            </p>
          </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">8</span>
                {t("privacy.section8.title")}
            </h2>
              <p className="text-gray-700 dark:text-gray-300 pl-9">
                {t("privacy.section8.desc")}
            </p>
          </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">9</span>
                {t("privacy.section9.title")}
            </h2>
              <p className="text-gray-700 dark:text-gray-300 pl-9">
                {t("privacy.section9.desc")}
            </p>
          </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">10</span>
                {t("privacy.section10.title")}
            </h2>
              <p className="text-gray-700 dark:text-gray-300 pl-9">
                {t("privacy.section10.desc")}
            </p>
          </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">11</span>
                {t("privacy.section11.title")}
            </h2>
              <p className="text-gray-700 dark:text-gray-300 pl-9">
                {t("privacy.section11.desc")}
            </p>
          </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">12</span>
                {t("privacy.section12.title")}
            </h2>
              <p className="text-gray-700 dark:text-gray-300 pl-9">
                {t("privacy.section12.desc")}
            </p>
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 pl-9">
                <p className="font-medium text-gray-900 dark:text-gray-100">{t("privacy.contact.title")}</p>
                <p className="text-gray-700 dark:text-gray-300">{t("privacy.contact.email")}</p>
                <p className="text-gray-700 dark:text-gray-300">{t("privacy.contact.address")}</p>
            </div>
          </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 