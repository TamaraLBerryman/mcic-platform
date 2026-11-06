export const DEFAULT_DESK_LAYOUT = [
    {
        id: 'pod-0',
        podLabel: 'POD 0',
        category: 'staff',
        rows: [
            { id: 'r1', is2Col: true, desks: [{ name: '2. Dina Titkova', role: 'Senior Manager, Entrepreneurship' }, { name: '3. Celine Olarte', role: 'Program Coordinator' }] }
        ]
    },
    {
        id: 'pod-1',
        podLabel: 'POD 1',
        category: 'staff',
        rows: [
            { id: 'r2', is2Col: true, desks: [{ name: '4. Steven', role: 'Project Officer - Splice' }, { name: '5. Nina Juhl', role: 'Senior Manager, Entrepreneurship' }] },
            { id: 'r3', is2Col: true, desks: [{ name: '6. Maddison McCoy', role: 'Community Manager, Engineering' }, { name: '7. Wisiani Wijaya', role: 'Investment Portfolio Coordinator' }] }
        ]
    },
    {
        id: 'pod-2',
        podLabel: 'POD 2',
        category: 'staff',
        rows: [
            { id: 'r4', is2Col: true, desks: [{ name: '8. Vern Chan', role: 'Global Program Manager' }, { name: '9. Hotdesk', role: '(Founders Staff Only)' }] },
            { id: 'r5', is2Col: true, desks: [{ name: '10. Sasha Whittle', role: 'Program Manager' }, { name: '11. Joseph Po', role: 'Health Accelerator Program Manager' }] }
        ]
    },
    {
        id: 'pod-3',
        podLabel: 'POD 3',
        category: 'staff',
        rows: [
            { id: 'r6', is2Col: true, desks: [{ name: '12. Mariana Luis Castillo Patron', role: 'Community Manager' }, { name: '13. Georgia Lyons', role: 'Program Manager' }] },
            { id: 'r7', is2Col: true, desks: [{ name: '14. Ria Kapoor', role: 'Comms Intern' }, { name: '15. Eleni Assargiotis', role: 'Program Manager, Foundry 10x' }] }
        ]
    },
    {
        id: 'pod-4',
        podLabel: 'POD 4',
        category: 'staff',
        rows: [
            { id: 'r8', is2Col: true, desks: [{ name: '16. Priscilla Tan', role: 'Program Manager, Edu Entre' }, { name: '17. Hotdesk', role: '(Founders Staff Only)' }] },
            { id: 'r9', is2Col: true, desks: [{ name: '18. Hamish McFarlane', role: 'MCIC Makerspace Coordinator' }, { name: '19. Tamara Berryman', role: 'Event Coordinator' }] }
        ]
    },
    {
        id: 'pod-5',
        podLabel: 'POD 5',
        category: 'resident',
        rows: [
            { id: 'r10', is2Col: false, desks: [{ name: '20. Reckro', role: 'Reuben Roy' }, { name: '21. Reckro' }, { name: '22. Hotdesk', type: 'hotdesk-red' }] },
            { id: 'r11', is2Col: false, desks: [{ name: '23. Talk Lawyers', role: 'Simon Lim' }, { name: '24. Green Dynamic' }, { name: '25. Green Dynamic' }] }
        ]
    },
    {
        id: 'pod-6',
        podLabel: 'POD 6',
        category: 'resident',
        rows: [
            { id: 'r12', is2Col: false, desks: [{ name: '26. Peak Medical' }, { name: '27. Peak Medical' }, { name: '28. Hotdesk', type: 'hotdesk-red' }] },
            { id: 'r13', is2Col: false, desks: [{ name: '29. Gridsight' }, { name: '30. Gridsight' }, { name: '31. Gridsight' }] }
        ]
    },
    {
        id: 'pod-7',
        podLabel: 'POD 7',
        category: 'resident',
        rows: [
            { id: 'r14', is2Col: false, desks: [{ name: '32. Extraterrestrial Power', role: 'Peter Toth' }, { name: '33. Extraterrestrial Power' }, { name: '34. Extraterrestrial Power', role: 'Jacques-Samuel Prolon' }] }
        ]
    },
    {
        id: 'framery-block',
        category: 'amenity',
        desks: [{ name: 'Meeting Pod' }, { name: 'Meeting Pod' }]
    },
    {
        id: 'pod-8',
        podLabel: 'POD 8',
        category: 'resident',
        rows: [
            { id: 'r15', is2Col: true, desks: [{ name: '35. Vesiculate', role: 'Chin (Ken) Wong' }, { name: '37. Square Storm Interactive', role: 'Matt Cabanag' }] }
        ]
    },
    {
        id: 'pod-9',
        podLabel: 'POD 9',
        category: 'resident',
        rows: [
            { id: 'r16', is2Col: true, desks: [{ name: '38. ConnectOnion' }, { name: '40. Clave Systems' }] },
            { id: 'r17', is2Col: true, desks: [{ name: '41. ConnectOnion', role: 'Aaron' }, { name: '43. Clave Systems', role: 'Sam Brew' }] }
        ]
    },
    {
        id: 'pod-10',
        podLabel: 'POD 10',
        category: 'resident',
        rows: [
            { id: 'r18', is2Col: false, desks: [{ name: '44. Vixia' }, { name: '45. DocuBuild' }, { name: '46. Hotdesk', type: 'hotdesk-red' }] },
            { id: 'r19', is2Col: false, desks: [{ name: '47. Tendor', role: 'Jason Cai' }, { name: '48. Tendor' }, { name: '49. Tendor' }] }
        ]
    },
    {
        id: 'pod-11',
        podLabel: 'POD 11',
        category: 'resident',
        rows: [
            { id: 'r20', is2Col: false, desks: [{ name: '50. Zenith' }, { name: '51. Zenith' }, { name: '52. Zenith' }] },
            { id: 'r21', is2Col: false, desks: [{ name: '53. Zenith' }, { name: '54. Zenith' }, { name: '55. Zenith' }] }
        ]
    },
    {
        id: 'pod-12',
        podLabel: 'POD 12',
        category: 'resident',
        rows: [
            { id: 'r22', is2Col: false, desks: [{ name: '56. Innersteps', role: 'Jesse' }, { name: '57. Innersteps' }, { name: '58. Innersteps', role: 'Matt' }] },
            { id: 'r23', is2Col: false, desks: [{ name: '59. Vocare' }, { name: '60. Vocare' }, { name: '61. Vocare' }] }
        ]
    },
    {
        id: 'pod-13',
        podLabel: 'POD 13',
        category: 'resident',
        rows: [
            { id: 'r24', is2Col: false, desks: [{ name: '62. Rhombus AI' }, { name: '63. Rhombus AI' }, { name: '64. Rhombus AI' }] },
            { id: 'r25', is2Col: false, desks: [{ name: '65. Hello solar again' }, { name: '66. Hoogly' }, { name: '67. Hoogly', role: 'Mohit Midha' }] }
        ]
    },
    {
        id: 'pod-14',
        podLabel: 'POD 14',
        category: 'resident',
        rows: [
            { id: 'r26', is2Col: true, desks: [{ name: '68. Hello solar again' }, { name: '70. Hello solar again' }] }
        ]
    }
];

export function deskSlotKey(podId, rowId, index) {
    return `${podId}__${rowId}__${index}`;
}

export function parseDeskSlotKey(key) {
    const [podId, rowId, index] = String(key || '').split('__');
    const parsed = Number(index);
    if (!podId || !rowId || !Number.isInteger(parsed)) return null;
    return { podId, rowId, index: parsed };
}

export function isHotDesk(desk) {
    if (!desk) return false;
    if (desk.type === 'hotdesk-red') return true;
    return /hotdesk/i.test(desk.name || '');
}

export function findDesk(layout, podId, rowId, index) {
    const pod = layout.find((item) => item.id === podId);
    const row = pod?.rows?.find((item) => item.id === rowId);
    return row?.desks?.[index] || null;
}

export function patchDesk(layout, podId, rowId, index, patch) {
    return layout.map((pod) => {
        if (pod.id !== podId || !pod.rows) return pod;
        return {
            ...pod,
            rows: pod.rows.map((row) => {
                if (row.id !== rowId) return row;
                return {
                    ...row,
                    desks: row.desks.map((desk, deskIndex) => (
                        deskIndex === index ? { ...desk, ...patch } : desk
                    ))
                };
            })
        };
    });
}

export function swapDesks(layout, source, target) {
    const sourceDesk = findDesk(layout, source.podId, source.rowId, source.index);
    const targetDesk = findDesk(layout, target.podId, target.rowId, target.index);
    if (!sourceDesk || !targetDesk) return layout;

    const sourceFields = { name: sourceDesk.name, role: sourceDesk.role || '', type: sourceDesk.type || '' };
    const targetFields = { name: targetDesk.name, role: targetDesk.role || '', type: targetDesk.type || '' };

    return patchDesk(
        patchDesk(layout, source.podId, source.rowId, source.index, targetFields),
        target.podId,
        target.rowId,
        target.index,
        sourceFields
    );
}
