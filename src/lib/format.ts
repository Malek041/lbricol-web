export const formatJobDate = (value: string) => {
    if (!value) return '';
    if (value.includes('-')) return value;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
        return new Date(parsed).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
    return value;
};

export const formatJobPrice = (value: string | number) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'number') return String(value);
    const cleaned = value.replace(/[^\d.]/g, '');
    return cleaned || value;
};
