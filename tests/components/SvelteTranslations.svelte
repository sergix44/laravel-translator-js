<script>
    import {__, t, trans_choice, locale} from '../../src/svelte'
    import SvelteChild from './SvelteChild.svelte'
</script>

<h1 data-testid="title">{$__('Welcome!')}</h1>
<p data-testid="greeting">{$t('Welcome, :name!', {name: 'John'})}</p>
<p data-testid="minutes">{$trans_choice('{1} :count minute ago|[2,*] :count minutes ago', 2)}</p>
<p data-testid="fallback">{$__('Shared')}</p>
<input data-testid="input" placeholder={$__('Welcome!')} />
<SvelteChild label={$__('Welcome!')} />
<select data-testid="select" bind:value={$locale}>
    <option value="en">English</option>
    <option value="pt">Português</option>
</select>
