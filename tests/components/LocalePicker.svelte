<script>
    import {locale} from '../../src/svelte'
</script>

<select data-testid="select" bind:value={$locale}>
    <option value="en">English</option>
    <option value="pt">Português</option>
</select>
<span data-testid="current">{$locale}</span>
