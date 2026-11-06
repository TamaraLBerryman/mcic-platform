export const ACCESS_PIPELINE = [
    {
        step: 1,
        title: 'Form Submitted',
        detail: 'Form Submitted.'
    },
    {
        step: 2,
        title: 'Founders Review',
        detail: 'Reviewed by Founders and sent to Security (once per week).'
    },
    {
        step: 3,
        title: 'Security Review',
        detail: 'Security Review.'
    },
    {
        step: 4,
        title: 'Notification',
        detail: 'Notification sent.'
    }
];

export function pipelineStepOf(application) {
    const step = Number(application?.pipelineStep);
    if (step >= 1 && step <= ACCESS_PIPELINE.length) return step;
    return 1;
}
