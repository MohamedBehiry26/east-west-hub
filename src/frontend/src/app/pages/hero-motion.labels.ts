// Kept with the lazy homepage rather than the shared locale bundle.
export const heroMotionLabels = {
  en: {
    enable: 'Enable Motion', disable: 'Disable Motion', reduced: 'Device motion is disabled by your motion preference.',
    status: { off: 'Optional: tilt your phone to move the scene.', permission: 'Waiting for permission…',
      waiting: 'Waiting for device motion…', on: 'Device motion enabled.', unsupported: 'Device motion is not supported here. Touch still works.',
      denied: 'Permission denied. Touch still works.', unavailable: 'No usable sensor readings. Touch still works.' }
  },
  ar: {
    enable: 'تفعيل حركة الجهاز', disable: 'إيقاف حركة الجهاز', reduced: 'حركة الجهاز معطّلة حسب إعداد تقليل الحركة.',
    status: { off: 'اختياري: أَمِل هاتفك لتحريك المشهد.', permission: 'في انتظار الإذن…',
      waiting: 'في انتظار حركة الجهاز…', on: 'حركة الجهاز مفعّلة.', unsupported: 'حركة الجهاز غير مدعومة هنا. اللمس متاح.',
      denied: 'لم يُسمح بالوصول للحساس. اللمس متاح.', unavailable: 'لا توجد قراءات حسّاس صالحة. اللمس متاح.' }
  }
} as const;
