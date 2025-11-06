

export class TestRaceDto {
    constructor(
        private withoutProtect: number,
        private atomic: number,
        private optimistic: number,
        private pesimistic: number
    ) { }
}